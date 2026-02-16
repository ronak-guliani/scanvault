import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { Category, ClientExtractionResult, ExtractedField } from "@scanvault/shared";

type CategoryChoice = { name: string; slug: string };

interface CopilotExtractionInput {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  categories: CategoryChoice[];
}

function fileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index <= 0) return "";
  return fileName.slice(index);
}

function sanitizeAssetName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .slice(0, 180);
}

function inferAssetName(fields: ExtractedField[], categoryName: string, fallbackFileName: string): string {
  const extension = fileExtension(fallbackFileName);
  const byKey = (key: string): string | undefined => {
    const match = fields.find((field) => field.key === key);
    return match ? String(match.value).trim() : undefined;
  };

  if (categoryName.toLowerCase() === "finance") {
    const store = byKey("store_name");
    const receiptNumber = byKey("receipt_number") ?? byKey("invoice_number");
    const date = byKey("date")?.replace(/[^\d/-]/g, "");
    const pieces = [store, "Receipt", receiptNumber, date].filter((value): value is string => Boolean(value && value.length > 0));
    if (pieces.length > 0) {
      const candidate = sanitizeAssetName(pieces.join(" - "));
      if (candidate) return `${candidate}${extension}`;
    }
  }

  const categoryPrefix = categoryName.trim().length > 0 ? categoryName : "Document";
  const fallbackBase = fallbackFileName.replace(/\.[^.]+$/, "");
  const candidate = sanitizeAssetName(`${categoryPrefix} - ${fallbackBase}`);
  return `${candidate || fallbackBase}${extension}`;
}

function normalizeCategorySlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function splitCommand(commandLine: string): string[] {
  return (commandLine.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((part) =>
    part.replace(/^['"]|['"]$/g, "")
  );
}

function inferCategorySlug(fileName: string, categories: CategoryChoice[], signalText?: string): string {
  const signal = `${fileName}\n${signalText ?? ""}`.toLowerCase();
  const scoreBySlug = new Map<string, number>();
  const addScore = (slug: string, points: number): void => {
    if (!categories.some((category) => category.slug === slug)) return;
    scoreBySlug.set(slug, (scoreBySlug.get(slug) ?? 0) + points);
  };

  const rules: Array<{ slug: string; keywords: string[] }> = [
    { slug: "finance", keywords: ["invoice", "receipt", "bill", "expense", "tax", "total", "subtotal", "payment"] },
    { slug: "travel", keywords: ["flight", "hotel", "boarding", "itinerary", "trip", "reservation"] },
    { slug: "health", keywords: ["health", "lab", "medical", "prescription", "clinic", "doctor"] },
    { slug: "fitness", keywords: ["fitness", "workout", "calorie", "weight", "protein", "exercise"] },
    { slug: "work", keywords: ["contract", "timesheet", "salary", "proposal", "payroll", "meeting"] },
    { slug: "school", keywords: ["class", "homework", "lecture", "exam", "whiteboard", "syllabus", "school"] }
  ];

  for (const rule of rules) {
    const matches = rule.keywords.filter((keyword) => signal.includes(keyword)).length;
    if (matches > 0) addScore(rule.slug, matches * 2);
  }

  for (const category of categories) {
    const nameTokens = category.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const slugTokens = category.slug.split("-").filter(Boolean);
    const tokenMatches = [...nameTokens, ...slugTokens].filter((token) => token.length > 2 && signal.includes(token)).length;
    if (tokenMatches > 0) addScore(category.slug, tokenMatches);
  }

  let winner = categories.find((category) => category.slug === "general")?.slug ?? categories[0]?.slug ?? "general";
  let winnerScore = -1;
  for (const category of categories) {
    const score = scoreBySlug.get(category.slug) ?? 0;
    if (score > winnerScore) {
      winner = category.slug;
      winnerScore = score;
    }
  }
  return winner;
}

function normalizeFields(value: unknown): ExtractedField[] {
  if (!Array.isArray(value)) return [];

  const normalized: ExtractedField[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;

    const field = item as Record<string, unknown>;
    if (typeof field.key !== "string" || field.key.trim().length === 0) continue;
    const rawValue = field.value;
    if (typeof rawValue !== "string" && typeof rawValue !== "number") continue;

    normalized.push({
      key: field.key.trim().slice(0, 100),
      value: typeof rawValue === "string" ? rawValue.slice(0, 2000) : rawValue,
      unit: typeof field.unit === "string" ? field.unit.slice(0, 50) : undefined,
      confidence:
        typeof field.confidence === "number" && field.confidence >= 0 && field.confidence <= 1
          ? field.confidence
          : 0.85,
      source: field.source === "ocr" ? "ocr" : "ai"
    });
  }

  return normalized.slice(0, 150);
}

function normalizeEntities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()))]
    .filter(Boolean)
    .map((item) => item.slice(0, 120))
    .slice(0, 50);
}

function normalizeCopilotOutput(
  output: unknown,
  categories: CategoryChoice[],
  fallbackFileName: string,
  fallbackFileSizeBytes: number
): ClientExtractionResult {
  if (typeof output !== "object" || output === null) {
    throw new Error("Copilot extractor output must be a JSON object");
  }

  const parsed = output as Record<string, unknown>;
  const fallbackCategorySlug = inferCategorySlug(
    fallbackFileName,
    categories,
    `${typeof parsed.summary === "string" ? parsed.summary : ""}\n${typeof parsed.rawText === "string" ? parsed.rawText : ""}`
  );
  const fallbackCategoryName =
    categories.find((category) => category.slug === fallbackCategorySlug)?.name ?? "General";

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim().slice(0, 5000)
      : `Uploaded ${fallbackFileName} (${fallbackFileSizeBytes} bytes).`;

  const categorySlug =
    typeof parsed.categorySlug === "string" && parsed.categorySlug.trim().length > 0
      ? normalizeCategorySlug(parsed.categorySlug)
      : fallbackCategorySlug;
  const categoryName =
    typeof parsed.categoryName === "string" && parsed.categoryName.trim().length > 0
      ? parsed.categoryName.trim().slice(0, 100)
      : fallbackCategoryName;
  const normalizedFields = normalizeFields(parsed.fields);
  const assetNameRaw =
    typeof parsed.assetName === "string" && parsed.assetName.trim().length > 0
      ? sanitizeAssetName(parsed.assetName)
      : inferAssetName(normalizedFields, categoryName, fallbackFileName);

  return {
    summary,
    fields: normalizedFields,
    entities: normalizeEntities(parsed.entities),
    categorySlug,
    categoryName,
    assetName: assetNameRaw || fallbackFileName,
    rawText:
      typeof parsed.rawText === "string" && parsed.rawText.trim().length > 0
        ? parsed.rawText.slice(0, 20000)
        : undefined
  };
}

async function runLocalTesseract(filePath: string): Promise<string | null> {
  const child = spawn("tesseract", [filePath, "stdout"], { stdio: ["ignore", "pipe", "ignore"], shell: false });
  const chunks: Buffer[] = [];
  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const exitCode = await new Promise<number>((resolve) => {
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) return null;
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text.length > 0 ? text : null;
}

async function getGitHubToken(): Promise<string | null> {
  if (process.env.VAULT_GITHUB_TOKEN && process.env.VAULT_GITHUB_TOKEN.trim().length > 0) {
    return process.env.VAULT_GITHUB_TOKEN.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    return process.env.GITHUB_TOKEN.trim();
  }
  const child = spawn("gh", ["auth", "token"], { stdio: ["ignore", "pipe", "ignore"], shell: false });
  const chunks: Buffer[] = [];
  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const exitCode = await new Promise<number>((resolve) => {
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) return null;
  const token = Buffer.concat(chunks).toString("utf8").trim();
  return token.length > 0 ? token : null;
}

async function requestGitHubModelsExtraction(
  input: CopilotExtractionInput,
  model: string,
  forceDetailedFields = false
): Promise<ClientExtractionResult | null> {
  if (!input.mimeType.startsWith("image/")) return null;
  const token = await getGitHubToken();
  if (!token) {
    throw new Error("Missing GitHub token for Copilot extraction. Set `VAULT_GITHUB_TOKEN` (or `GITHUB_TOKEN`) to a token with GitHub Models read access.");
  }

  const imageBase64 = (await readFile(input.filePath)).toString("base64");
  const categories = input.categories.map((category) => `${category.slug} (${category.name})`).join(", ");
  const prompt = [
    "Analyze this document image and infer what type of document it is from visual/content cues.",
    "Return strictly JSON keys: summary, fields, entities, categorySlug, categoryName, assetName, rawText.",
    "Extract fields that are natural for the detected document type and prioritize high-confidence values.",
    "For transaction-like documents, include itemized rows and monetary totals when visible.",
    "Do not emit file metadata fields such as file_name or file_size_bytes.",
    forceDetailedFields
      ? "Do not leave `fields` empty when the document contains extractable details; include all useful structured fields visible in the image."
      : "",
    `Prefer one of these categories when relevant: ${categories}.`
  ].filter(Boolean).join(" ");

  const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${imageBase64}` } }
          ]
        }
      ]
    })
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const hint = response.status === 401 || response.status === 403
      ? " Your current token is not authorized for GitHub Models; use a PAT with Models read access via `VAULT_GITHUB_TOKEN`."
      : "";
    throw new Error(`Copilot model request failed (${response.status}) for '${model}'.${hint}${errorText ? ` ${errorText}` : ""}`);
  }

  const json = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return normalizeCopilotOutput(JSON.parse(content), input.categories, input.fileName, input.fileSizeBytes);
  } catch {
    return null;
  }
}

function parseReceiptLineItems(ocrText: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const lineItemRegex =
    /^([A-Za-z][A-Za-z0-9&().,'\-\/\s]{1,}?)\s+(?:(\d+)\s*x\s*)?([$€]?\s?\d+\.\d{2})$/i;
  const tableLineRegex =
    /^(\d+)\s+(.+?)\s+([$€]?\s?\d+(?:[.,]\d{2})?)\s+([$€]?\s?\d+(?:[.,]\d{2})?)$/i;
  const trailingAmountRegex =
    /^(.+?)\s+([$€]?\s?\d+(?:[.,]\d{2})?)$/i;
  const parseMoney = (value: string): number => Number(value.replace(/[$€\s]/g, "").replace(",", "."));
  const consumedLines = new Set<string>();
  let itemIndex = 1;
  for (const line of lines) {
    const tableMatch = line.match(tableLineRegex);
    if (tableMatch) {
      const quantity = Number(tableMatch[1]);
      const name = tableMatch[2].trim();
      const unitPrice = parseMoney(tableMatch[3]);
      const amount = parseMoney(tableMatch[4]);
      if (
        Number.isFinite(quantity) &&
        quantity > 0 &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0 &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        fields.push({ key: `line_item_${itemIndex}_name`, value: name, confidence: 0.83, source: "ocr" });
        fields.push({ key: `line_item_${itemIndex}_qty`, value: quantity, confidence: 0.83, source: "ocr" });
        fields.push({ key: `line_item_${itemIndex}_unit_price`, value: unitPrice, confidence: 0.8, source: "ocr" });
        fields.push({ key: `line_item_${itemIndex}_price`, value: amount, confidence: 0.83, source: "ocr" });
        itemIndex += 1;
        consumedLines.add(line);
        continue;
      }
    }

    const match = line.match(lineItemRegex);
    if (!match) continue;
    const name = match[1].trim();
    const quantity = match[2] ? Number(match[2]) : undefined;
    const amount = parseMoney(match[3]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (/^(total|receipt total|tax|subtotal|cash receipt|thank you|credit card|network id|manager)\b/i.test(name)) continue;
    fields.push({ key: `line_item_${itemIndex}_name`, value: name, confidence: 0.8, source: "ocr" });
    fields.push({ key: `line_item_${itemIndex}_price`, value: amount, confidence: 0.8, source: "ocr" });
    if (Number.isFinite(quantity) && quantity && quantity > 1) {
      fields.push({ key: `line_item_${itemIndex}_qty`, value: quantity, confidence: 0.72, source: "ocr" });
    }
    itemIndex += 1;
    consumedLines.add(line);

    continue;
  }

  for (const line of lines) {
    if (consumedLines.has(line)) continue;
    if (/^(total|receipt total|tax|subtotal|cash|change|tender|visa|mastercard|thank you)\b/i.test(line)) continue;
    const match = line.match(trailingAmountRegex);
    if (!match) continue;
    const name = match[1].trim().replace(/\s{2,}/g, " ");
    const amount = parseMoney(match[2]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!/[A-Za-z]{2,}/.test(name)) continue;
    fields.push({ key: `line_item_${itemIndex}_name`, value: name, confidence: 0.75, source: "ocr" });
    fields.push({ key: `line_item_${itemIndex}_price`, value: amount, confidence: 0.75, source: "ocr" });
    itemIndex += 1;
  }

  return fields;
}

function shouldParseWorkoutSchedule(ocrText: string): boolean {
  const normalized = ocrText.toLowerCase();
  const dayMatches = (normalized.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g) ?? []).length;
  const hasWorkoutSignals = /\b(workout|exercise|schedule|rest day|cardio|biceps|triceps|legs|chest|back|lats)\b/.test(normalized);
  const looksLikeReceipt = /\b(receipt|invoice|subtotal|tax|total|cashier|payment)\b/.test(normalized);
  if (looksLikeReceipt) return false;
  return dayMatches >= 2 && hasWorkoutSignals;
}

function parseWorkoutScheduleFields(ocrText: string): { fields: ExtractedField[]; entities: string[] } {
  const fields: ExtractedField[] = [];
  const entities = new Set<string>();
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.replace(/[^a-zA-Z0-9&\s-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const schedule = new Map<string, string>();

  const normalizeWorkout = (input: string): string =>
    input
      .replace(/\b6\b/g, "&")
      .replace(/\bbice\b/i, "Biceps")
      .replace(/\blats?\b/i, "Lats")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const assignNextMissingDay = (value: string): void => {
    const targetDay = days.find((day) => !schedule.has(day) && day !== "sunday");
    if (!targetDay) return;
    schedule.set(targetDay, normalizeWorkout(value));
  };

  for (const rawLine of lines) {
    const line = rawLine.toLowerCase();
    const matchedDay = days.find((day) => line.includes(day));
    if (matchedDay) {
      const remainder = rawLine
        .replace(new RegExp(matchedDay, "i"), "")
        .replace(/^[\s:-]+/, "")
        .trim();
      if (remainder.length > 0) {
        schedule.set(matchedDay, normalizeWorkout(remainder));
      } else if (matchedDay === "sunday" && line.includes("rest")) {
        schedule.set("sunday", "Rest Day");
      }
      continue;
    }

    if (/[a-z]{3,}\s*&\s*[a-z]{3,}/i.test(rawLine)) {
      assignNextMissingDay(rawLine);
      continue;
    }
    if (/rest day/i.test(rawLine)) {
      schedule.set("sunday", "Rest Day");
      continue;
    }
  }

  for (const [day, workout] of schedule.entries()) {
    fields.push({
      key: `workout_${day}`,
      value: workout,
      confidence: 0.75,
      source: "ocr"
    });
    workout
      .split("&")
      .map((part) => part.trim())
      .filter((part) => /^[A-Za-z][A-Za-z\s]{2,}$/.test(part))
      .forEach((part) => entities.add(part));
  }

  if (schedule.get("sunday") === "Rest Day") {
    fields.push({ key: "rest_day", value: "Sunday", confidence: 0.78, source: "ocr" });
  }

  return { fields, entities: [...entities].slice(0, 20) };
}

function createFallbackExtraction(
  fileName: string,
  fileSizeBytes: number,
  categories: CategoryChoice[],
  ocrText?: string
): ClientExtractionResult {
  const searchableText = `${fileName}\n${ocrText ?? ""}`.toLowerCase();
  const categorySlug = inferCategorySlug(fileName, categories, searchableText);
  const categoryName = categories.find((category) => category.slug === categorySlug)?.name ?? "General";

  const fields: ExtractedField[] = [];
  const entities: string[] = [];

  const storeLine = (ocrText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /[A-Za-z]{3,}/.test(line) && !/receipt|total|tax|thank you|credit card/i.test(line));
  if (storeLine) {
    fields.push({ key: "store_name", value: storeLine, confidence: 0.7, source: "ocr" });
  }

  const totalMatch = (ocrText ?? "").match(/total[:\s]*([$€]?\s?\d+(?:\.\d{2})?)/i);
  if (totalMatch) {
    fields.push({ key: "total_amount", value: totalMatch[1].replace(/\s+/g, ""), confidence: 0.8, source: "ocr" });
  }
  const taxMatch = (ocrText ?? "").match(/tax[:\s]*([$€]?\s?\d+(?:\.\d{2})?)/i);
  if (taxMatch) {
    fields.push({ key: "tax_amount", value: taxMatch[1].replace(/\s+/g, ""), confidence: 0.78, source: "ocr" });
  }
  const dateMatch = (ocrText ?? "").match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (dateMatch) {
    fields.push({ key: "date", value: dateMatch[1], confidence: 0.75, source: "ocr" });
  }
  const phoneMatch = (ocrText ?? "").match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  if (phoneMatch) {
    fields.push({ key: "phone", value: phoneMatch[0], confidence: 0.75, source: "ocr" });
  }
  const receiptNumberMatch = (ocrText ?? "").match(/(?:receipt\s*#|invoice\s*#|order\s*#|po\s*#)\s*([A-Z0-9/-]{3,})/i);
  if (receiptNumberMatch) {
    fields.push({ key: "receipt_number", value: receiptNumberMatch[1], confidence: 0.72, source: "ocr" });
  }
  if (ocrText) {
    fields.push(...parseReceiptLineItems(ocrText));
    if (shouldParseWorkoutSchedule(ocrText)) {
      const workout = parseWorkoutScheduleFields(ocrText);
      fields.push(...workout.fields);
      workout.entities.forEach((entity) => entities.push(entity));
    }
  }

  return {
    summary:
      ocrText && ocrText.trim().length > 0
        ? `Uploaded ${fileName}. OCR-assisted extraction inferred ${categoryName} category.`
        : `Uploaded ${fileName} (${fileSizeBytes} bytes). Category inferred as ${categoryName}.`,
    fields,
    entities: [...new Set((storeLine ? [storeLine] : []).concat(entities))],
    categorySlug,
    categoryName,
    assetName: inferAssetName(fields, categoryName, fileName),
    rawText: ocrText && ocrText.trim().length > 0 ? ocrText.slice(0, 20000) : undefined
  };
}

function isReceiptLike(extraction: ClientExtractionResult, fileName: string): boolean {
  const signal = `${fileName} ${extraction.categorySlug ?? ""} ${extraction.categoryName ?? ""} ${extraction.rawText ?? ""}`.toLowerCase();
  return /receipt|invoice|subtotal|sales tax|total|payment instruction|bill to|ship to/.test(signal);
}

function shouldAugmentFromOcr(extraction: ClientExtractionResult, fileName: string): boolean {
  if (isReceiptLike(extraction, fileName)) {
    const lineItemCount = extraction.fields.filter((field) => field.key.startsWith("line_item_")).length;
    return extraction.fields.length < 10 || lineItemCount < 4;
  }
  return extraction.fields.length < 6;
}

function mergeExtractions(primary: ClientExtractionResult, fallback: ClientExtractionResult): ClientExtractionResult {
  const mergedFields: ExtractedField[] = [];
  const seen = new Set<string>();
  for (const field of [...primary.fields, ...fallback.fields]) {
    const signature = `${field.key.toLowerCase()}::${String(field.value).toLowerCase()}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    mergedFields.push(field);
  }

  return {
    summary: primary.summary,
    fields: mergedFields.slice(0, 200),
    entities: [...new Set([...primary.entities, ...fallback.entities])].slice(0, 60),
    categorySlug:
      fallback.categorySlug === "finance" && primary.categorySlug !== "finance"
        ? "finance"
        : primary.categorySlug === "general" && fallback.categorySlug
          ? fallback.categorySlug
          : primary.categorySlug,
    categoryName:
      fallback.categorySlug === "finance" && primary.categorySlug !== "finance"
        ? fallback.categoryName
        : primary.categorySlug === "general" && fallback.categoryName
          ? fallback.categoryName
          : primary.categoryName,
    assetName: primary.assetName ?? fallback.assetName,
    rawText: primary.rawText ?? fallback.rawText
  };
}

async function runCopilotExtractor(commandLine: string, input: CopilotExtractionInput): Promise<ClientExtractionResult> {
  const parts = splitCommand(commandLine);
  const command = parts[0];
  const args = parts.slice(1);
  if (!command) throw new Error("copilot-extractor-cmd is empty");

  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], shell: false });
  const outputChunks: Buffer[] = [];
  const errorChunks: Buffer[] = [];

  child.stdout.on("data", (chunk) => outputChunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => errorChunks.push(Buffer.from(chunk)));
  child.stdin.write(`${JSON.stringify(input)}\n`);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
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
  if (!stdout) throw new Error("Copilot extractor returned empty output");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Copilot extractor output must be valid JSON");
  }

  return normalizeCopilotOutput(parsed, input.categories, input.fileName, input.fileSizeBytes);
}

export async function extractWithCopilot(
  filePath: string,
  mimeType: string,
  categories: Category[],
  commandLine?: string,
  preferredModel = "gemini-3-pro"
): Promise<ClientExtractionResult> {
  const metadata = await stat(filePath);
  const fileName = basename(filePath);
  const input: CopilotExtractionInput = {
    filePath,
    fileName,
    mimeType,
    fileSizeBytes: metadata.size,
    categories: categories.map((category) => ({ name: category.name, slug: category.slug }))
  };

  if (!commandLine) {
    const aiResult = await requestGitHubModelsExtraction(input, preferredModel);
    if (!aiResult) {
      throw new Error(`Copilot extraction failed with model '${preferredModel}'.`);
    }
    if (aiResult.fields.length > 0) return aiResult;

    const retryResult = await requestGitHubModelsExtraction(input, preferredModel, true);
    if (retryResult?.fields.length) return retryResult;

    if (aiResult.rawText && aiResult.rawText.trim().length > 0) {
      const rawTextDerived = createFallbackExtraction(fileName, metadata.size, categories, aiResult.rawText);
      const merged = mergeExtractions(aiResult, rawTextDerived);
      if (merged.fields.length > 0) return merged;
    }

    throw new Error(`Copilot extraction failed with model '${preferredModel}'.`);
  }

  const copilotResult = await runCopilotExtractor(commandLine, input);
  return copilotResult;
}
