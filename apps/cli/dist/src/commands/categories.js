import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
export function registerCategoriesCommand(program) {
    const categories = program.command("categories").description("Category operations");
    categories
        .command("list")
        .description("List categories")
        .option("--json", "Output JSON")
        .option("--quiet", "Minimal output")
        .action(withErrorHandling(async (options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const result = await client.listCategories();
        printOutput(result, { json: options.json, quiet: options.quiet });
    }));
    categories
        .command("create <name>")
        .description("Create category")
        .option("--json", "Output JSON")
        .action(withErrorHandling(async (name, options) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const result = await client.createCategory(name);
        printOutput(result, { json: options.json });
    }));
    categories
        .command("default")
        .description("Alias for list")
        .action(withErrorHandling(async () => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);
        const result = await client.listCategories();
        printOutput(result);
    }));
}
//# sourceMappingURL=categories.js.map