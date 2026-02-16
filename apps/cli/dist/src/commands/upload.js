import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { extractWithCopilot } from "../lib/copilot-extract.js";
import { printOutput } from "../lib/output.js";
function inferMimeType(filePath) {
    const normalized = filePath.toLowerCase();
    if (normalized.endsWith(".png"))
        return "image/png";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg"))
        return "image/jpeg";
    if (normalized.endsWith(".webp"))
        return "image/webp";
    if (normalized.endsWith(".pdf"))
        return "application/pdf";
    return "application/octet-stream";
}
export function registerUploadCommand(program) {
    program
        .command("upload <files...>")
        .description("Upload one or more files")
        .option("--category <category>", "Override category for uploaded files")
        .option("--copilot", "Use Copilot extraction before upload confirmation")
        .option("--copilot-cmd <command>", "Override Copilot extractor command for this run")
        .option("--json", "Output JSON")
        .option("--quiet", "Minimal output")
        .action(withErrorHandling(async (files, options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const settings = await client.getSettings();
        const shouldUseCopilot = options.copilot === true || !settings.aiKeyVaultRef;
        const extractorCommand = options.copilotCmd ?? config.copilotExtractorCommand;
        const categories = shouldUseCopilot ? await client.listCategories() : [];
        const uploaded = [];
        const failed = [];
        for (const filePath of files) {
            try {
                const extracted = shouldUseCopilot
                    ? await extractWithCopilot(filePath, inferMimeType(filePath), categories, extractorCommand)
                    : undefined;
                if (extracted && options.category) {
                    extracted.categoryName = options.category;
                    extracted.categorySlug = undefined;
                }
                const result = await client.uploadFile(filePath, extracted ? { extracted } : undefined);
                uploaded.push({ file: filePath, ...result, mode: shouldUseCopilot ? "copilot" : "server" });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failed.push({ file: filePath, error: message });
            }
        }
        const result = {
            uploaded,
            failed,
            summary: {
                total: files.length,
                uploaded: uploaded.length,
                failed: failed.length
            }
        };
        printOutput(result, {
            json: options.json,
            quiet: options.quiet
        });
        if (failed.length > 0) {
            throw new Error(`${failed.length} upload(s) failed`);
        }
    }));
}
//# sourceMappingURL=upload.js.map