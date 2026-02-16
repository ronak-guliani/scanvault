import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
export function registerExportCommand(program) {
    program
        .command("export <assetId>")
        .description("Export asset data")
        .option("--format <format>", "Export format", "json")
        .action(withErrorHandling(async (assetId, options) => {
        if ((options.format ?? "json") !== "json") {
            throw new Error("Only json export format is currently supported");
        }
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const asset = await client.getAsset(assetId);
        printOutput(asset, { json: true });
    }));
}
//# sourceMappingURL=export.js.map