import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig, setConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
function normalizeKey(key) {
    return key.toLowerCase();
}
export function registerConfigCommand(program) {
    const config = program.command("config").description("Manage local and server settings");
    config
        .command("get")
        .description("Get local and server config")
        .option("--json", "Output JSON")
        .action(withErrorHandling(async (options) => {
        const local = await getConfig();
        let server = null;
        try {
            const token = await getAccessToken();
            const client = new ApiClient(local.apiBaseUrl, token);
            server = await client.getSettings();
        }
        catch {
            server = null;
        }
        printOutput({ local, server }, { json: options.json });
    }));
    config
        .command("set <key> <value>")
        .description("Set local CLI config or remote extraction settings")
        .option("--json", "Output JSON")
        .action(withErrorHandling(async (key, value, options) => {
        const normalized = normalizeKey(key);
        const local = await getConfig();
        if (normalized === "api-base-url") {
            const updated = {
                ...local,
                apiBaseUrl: value
            };
            await setConfig(updated);
            printOutput(updated, { json: options.json });
            return;
        }
        if (normalized === "copilot-extractor-cmd") {
            const updated = {
                ...local,
                copilotExtractorCommand: value
            };
            await setConfig(updated);
            printOutput(updated, { json: options.json });
            return;
        }
        const token = await getAccessToken();
        const client = new ApiClient(local.apiBaseUrl, token);
        if (normalized === "extraction-mode") {
            const result = await client.updateSettings({ extractionMode: value });
            printOutput(result, { json: options.json });
            return;
        }
        if (normalized === "ai-provider") {
            const result = await client.updateSettings({ aiProvider: value });
            printOutput(result, { json: options.json });
            return;
        }
        if (normalized === "ai-key") {
            const result = await client.updateSettings({ apiKey: value });
            printOutput(result, { json: options.json });
            return;
        }
        throw new Error(`Unsupported config key: ${key}`);
    }));
}
//# sourceMappingURL=config.js.map