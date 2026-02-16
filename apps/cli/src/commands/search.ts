import type { Command } from "commander";
import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search assets with query syntax")
    .option("--limit <limit>", "Page size", "20")
    .option("--json", "Output JSON")
    .option("--quiet", "Minimal output")
    .option("--fields-only", "Only output extracted fields")
    .action(
      withErrorHandling(async (query: string, options: { limit?: string; json?: boolean; quiet?: boolean; fieldsOnly?: boolean }) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);

        const result = (await client.search(query, Number(options.limit ?? "20"))) as {
          query?: unknown;
          items?: Array<{ fields?: unknown[] }>;
        };

        if (options.fieldsOnly) {
          const fields = (result.items ?? []).flatMap((item) => item.fields ?? []);
          printOutput(fields, { json: true, quiet: options.quiet });
          return;
        }

        if (options.json) {
          printOutput(result, { json: true, quiet: options.quiet });
          return;
        }

        printOutput(result.items ?? [], { quiet: options.quiet });
      })
    );
}
