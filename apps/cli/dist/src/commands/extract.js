import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
async function resolveAsset(client, identifier) {
    if (identifier !== "latest") {
        return client.getAsset(identifier);
    }
    const list = await client.listAssets({ limit: 1 });
    const first = list.data?.[0];
    if (!first) {
        throw new Error("No assets found");
    }
    return first;
}
export function registerExtractCommand(program) {
    program
        .command("extract <assetId>")
        .description("Extract a specific field from an asset")
        .requiredOption("--field <field>", "Field key to extract")
        .option("--json", "Output JSON")
        .option("--quiet", "Minimal output")
        .action(withErrorHandling(async (assetId, options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const asset = await resolveAsset(client, assetId);
        const match = asset.fields.find((field) => field.key === options.field || field.key.includes(options.field));
        if (!match) {
            throw new Error(`Field '${options.field}' not found`);
        }
        printOutput(match.value, { json: options.json, quiet: options.quiet });
    }));
}
//# sourceMappingURL=extract.js.map