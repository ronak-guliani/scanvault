import { spawn } from "node:child_process";
import { basename } from "node:path";
import { stat } from "node:fs/promises";
function normalizeCategorySlug(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}
function splitCommand(commandLine) {
    return (commandLine.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((part) => part.replace(/^['"]|['"]$/g, ""));
}
function inferCategorySlug(fileName, categories) {
    const normalized = fileName.toLowerCase();
    const rules = [
        { slug: "finance", keywords: ["invoice", "receipt", "bill", "expense", "tax"] },
        { slug: "travel", keywords: ["flight", "hotel", "boarding", "itinerary", "trip"] },
        { slug: "health", keywords: ["health", "lab", "medical", "prescription", "clinic"] },
        { slug: "fitness", keywords: ["fitness", "workout", "calorie", "weight", "protein"] },
        { slug: "work", keywords: ["contract", "timesheet", "salary", "proposal", "payroll"] }
    ];
    for (const rule of rules) {
        if (!rule.keywords.some((keyword) => normalized.includes(keyword))) {
            continue;
        }
        const matched = categories.find((category) => category.slug === rule.slug);
        if (matched) {
            return matched.slug;
        }
    }
    const general = categories.find((category) => category.slug === "general");
    if (general) {
        return general.slug;
    }
    return categories[0]?.slug ?? "general";
}
function normalizeFields(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const normalized = [];
    for (const item of value) {
        if (typeof item !== "object" || item === null) {
            continue;
        }
        const field = item;
        if (typeof field.key !== "string" || field.key.trim().length === 0) {
            continue;
        }
        const rawValue = field.value;
        if (typeof rawValue !== "string" && typeof rawValue !== "number") {
            continue;
        }
        normalized.push({
            key: field.key.trim().slice(0, 100),
            value: typeof rawValue === "string" ? rawValue.slice(0, 2000) : rawValue,
            unit: typeof field.unit === "string" ? field.unit.slice(0, 50) : undefined,
            confidence: typeof field.confidence === "number" && field.confidence >= 0 && field.confidence <= 1
                ? field.confidence
                : 0.85,
            source: field.source === "ocr" ? "ocr" : "ai"
        });
    }
    return normalized.slice(0, 100);
}
function normalizeEntities(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return [...new Set(value.filter((item) => typeof item === "string").map((item) => item.trim()))]
        .filter(Boolean)
        .map((item) => item.slice(0, 120))
        .slice(0, 50);
}
function normalizeCopilotOutput(output, categories, fallbackFileName, fallbackFileSizeBytes) {
    if (typeof output !== "object" || output === null) {
        throw new Error("Copilot extractor output must be a JSON object");
    }
    const parsed = output;
    const fallbackCategorySlug = inferCategorySlug(fallbackFileName, categories);
    const fallbackCategoryName = categories.find((category) => category.slug === fallbackCategorySlug)?.name ?? "General";
    const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim().slice(0, 5000)
        : `Uploaded ${fallbackFileName} (${fallbackFileSizeBytes} bytes).`;
    const categorySlug = typeof parsed.categorySlug === "string" && parsed.categorySlug.trim().length > 0
        ? normalizeCategorySlug(parsed.categorySlug)
        : fallbackCategorySlug;
    const categoryName = typeof parsed.categoryName === "string" && parsed.categoryName.trim().length > 0
        ? parsed.categoryName.trim().slice(0, 100)
        : fallbackCategoryName;
    return {
        summary,
        fields: normalizeFields(parsed.fields),
        entities: normalizeEntities(parsed.entities),
        categorySlug,
        categoryName,
        rawText: typeof parsed.rawText === "string" && parsed.rawText.trim().length > 0
            ? parsed.rawText.slice(0, 20000)
            : undefined
    };
}
function createFallbackExtraction(fileName, fileSizeBytes, categories) {
    const categorySlug = inferCategorySlug(fileName, categories);
    const categoryName = categories.find((category) => category.slug === categorySlug)?.name ?? "General";
    return {
        summary: `Uploaded ${fileName} (${fileSizeBytes} bytes). Category inferred as ${categoryName}.`,
        fields: [
            {
                key: "file_name",
                value: fileName,
                confidence: 0.65,
                source: "ai"
            },
            {
                key: "file_size_bytes",
                value: fileSizeBytes,
                confidence: 0.95,
                source: "ai"
            }
        ],
        entities: [],
        categorySlug,
        categoryName
    };
}
async function runCopilotExtractor(commandLine, input) {
    const parts = splitCommand(commandLine);
    const command = parts[0];
    const args = parts.slice(1);
    if (!command) {
        throw new Error("copilot-extractor-cmd is empty");
    }
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], shell: false });
    const outputChunks = [];
    const errorChunks = [];
    child.stdout.on("data", (chunk) => outputChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => errorChunks.push(Buffer.from(chunk)));
    child.stdin.write(`${JSON.stringify(input)}\n`);
    child.stdin.end();
    const exitCode = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            reject(new Error("Copilot extractor timed out"));
        }, 120_000);
        child.on("error", reject);
        child.on("exit", (code) => {
            clearTimeout(timer);
            resolve(code ?? 1);
        });
    });
    if (exitCode !== 0) {
        const stderr = Buffer.concat(errorChunks).toString("utf8").trim();
        throw new Error(stderr ? `Copilot extractor failed: ${stderr}` : `Copilot extractor exited with code ${exitCode}`);
    }
    const stdout = Buffer.concat(outputChunks).toString("utf8").trim();
    if (!stdout) {
        throw new Error("Copilot extractor returned empty output");
    }
    let parsed;
    try {
        parsed = JSON.parse(stdout);
    }
    catch {
        throw new Error("Copilot extractor output must be valid JSON");
    }
    return normalizeCopilotOutput(parsed, input.categories, input.fileName, input.fileSizeBytes);
}
export async function extractWithCopilot(filePath, mimeType, categories, commandLine) {
    const metadata = await stat(filePath);
    const fileName = basename(filePath);
    const input = {
        filePath,
        fileName,
        mimeType,
        fileSizeBytes: metadata.size,
        categories: categories.map((category) => ({
            name: category.name,
            slug: category.slug
        }))
    };
    if (!commandLine) {
        return createFallbackExtraction(fileName, metadata.size, categories);
    }
    return runCopilotExtractor(commandLine, input);
}
//# sourceMappingURL=copilot-extract.js.map