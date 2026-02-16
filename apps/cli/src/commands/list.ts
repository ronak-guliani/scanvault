import type { Command } from "commander";
import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List assets")
    .option("--category <category>", "Category filter")
    .option("--status <status>", "Status filter")
    .option("--limit <limit>", "Page size", "20")
    .option("--json", "Output JSON")
    .option("--quiet", "Minimal output")
    .action(
      withErrorHandling(async (options: {
        category?: string;
        status?: string;
        limit?: string;
        json?: boolean;
        quiet?: boolean;
      }) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);

        const response = await client.listAssets({
          category: options.category,
          status: options.status,
          limit: Number(options.limit ?? "20")
        });

        const assets = response.data ?? [];
        if (options.json || options.quiet) {
          printOutput(assets, {
            json: options.json,
            quiet: options.quiet
          });
          return;
        }

        const categories = await client.listCategories();
        const categoryById = categories.reduce<Record<string, string>>((lookup, category) => {
          lookup[category.id] = category.name;
          return lookup;
        }, {});

        printOutput(
          assets.map((asset) => ({
            asset: asset.originalFileName,
            category: categoryById[asset.categoryId] ?? "Uncategorized",
            summary: asset.summary
          }))
        );
      })
    );
}
