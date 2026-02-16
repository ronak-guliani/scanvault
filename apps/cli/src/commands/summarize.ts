import type { Asset, Category } from "@scanvault/shared";
import type { Command } from "commander";
import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { runCopilotChat } from "../lib/copilot-chat.js";
import { printOutput } from "../lib/output.js";

function parseSinceWindow(input?: string): Date | undefined {
  if (!input) return undefined;
  const match = input.trim().toLowerCase().match(/^(\d+)\s*([hdwmy])$/);
  if (!match) throw new Error("Invalid --since format. Use values like 5d, 2w, 2m, 1y");
  const amount = Number(match[1]);
  const unit = match[2];
  const now = Date.now();
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000
  };
  return new Date(now - amount * multipliers[unit]);
}

function resolveCategory(categories: Category[], input: string): Category {
  const normalized = input.trim().toLowerCase();
  const category = categories.find(
    (item) => item.id === input || item.slug.toLowerCase() === normalized || item.name.toLowerCase() === normalized
  );
  if (!category) throw new Error(`Category not found: ${input}`);
  return category;
}

async function listCategoryAssets(client: ApiClient, categoryId: string): Promise<Asset[]> {
  const items: Asset[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.listAssets({ category: categoryId, limit: 100, continuationToken });
    items.push(...(page.data ?? []));
    continuationToken = page.pagination?.continuationToken;
  } while (continuationToken);
  return items;
}

function formatAssetForPrompt(asset: Asset): Record<string, unknown> {
  return {
    id: asset.id,
    name: asset.originalFileName,
    createdAt: asset.createdAt,
    status: asset.status,
    summary: asset.summary,
    fields: asset.fields.slice(0, 80),
    entities: asset.entities.slice(0, 30)
  };
}

export function registerSummarizeCommand(program: Command): void {
  program
    .command("summarize <category>")
    .description("Summarize a category with Copilot")
    .option("--since <duration>", "Time window (e.g. 5d, 2w, 2m, 1y)")
    .option("--json", "Output JSON")
    .option("--quiet", "Minimal output")
    .action(
      withErrorHandling(
        async (categoryInput: string, options: { since?: string; json?: boolean; quiet?: boolean }) => {
          const config = await getConfig();
          const token = await getAccessToken();
          const client = new ApiClient(config.apiBaseUrl, token);

          const categories = await client.listCategories();
          const category = resolveCategory(categories, categoryInput);
          const since = parseSinceWindow(options.since);
          const assets = await listCategoryAssets(client, category.id);
          const filtered = since ? assets.filter((asset) => new Date(asset.createdAt).getTime() >= since.getTime()) : assets;

          if (filtered.length === 0) {
            throw new Error("No assets found for this category and time window");
          }

          const prompt = [
            `Summarize the user's ${category.name} category.`,
            "Return exactly 4-5 sentences in plain English.",
            "No markdown, no bullets, no headings.",
            "Include totals/counts/trends only if supported by the data.",
            `Time window: ${options.since ?? "all time"}.`,
            "Asset data JSON:",
            JSON.stringify(filtered.map(formatAssetForPrompt))
          ].join("\n");

          const summary = await runCopilotChat(prompt, {
            system: "You are ScanVault Copilot. Be concise, factual, and calculation-aware."
          });

          if (options.json) {
            printOutput(
              {
                category: category.slug,
                categoryName: category.name,
                since: options.since ?? null,
                assetCount: filtered.length,
                summary
              },
              { json: true, quiet: options.quiet }
            );
            return;
          }

          printOutput(summary, { quiet: options.quiet });
        }
      )
    );
}
