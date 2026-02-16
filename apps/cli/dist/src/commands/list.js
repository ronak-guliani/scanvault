import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
export function registerListCommand(program) {
    program
        .command("list")
        .description("List assets")
        .option("--category <category>", "Category filter")
        .option("--status <status>", "Status filter")
        .option("--limit <limit>", "Page size", "20")
        .option("--json", "Output JSON")
        .option("--quiet", "Minimal output")
        .action(withErrorHandling(async (options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const response = await client.listAssets({
            category: options.category,
            status: options.status,
            limit: Number(options.limit ?? "20")
        });
        printOutput(response.data ?? [], {
            json: options.json,
            quiet: options.quiet
        });
    }));
}
//# sourceMappingURL=list.js.map