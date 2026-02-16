import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
export function registerSearchCommand(program) {
    program
        .command("search <query>")
        .description("Search assets with query syntax")
        .option("--limit <limit>", "Page size", "20")
        .option("--json", "Output JSON")
        .option("--quiet", "Minimal output")
        .option("--fields-only", "Only output extracted fields")
        .action(withErrorHandling(async (query, options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const result = (await client.search(query, Number(options.limit ?? "20")));
        if (options.fieldsOnly) {
            const fields = (result.items ?? []).flatMap((item) => item.fields ?? []);
            printOutput(fields, { json: true, quiet: options.quiet });
            return;
        }
        printOutput(result, { json: options.json, quiet: options.quiet });
    }));
}
//# sourceMappingURL=search.js.map