import type { Asset, Category } from "@scanvault/shared";
import type { Command } from "commander";
import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { runCopilotChat } from "../lib/copilot-chat.js";
import { printOutput } from "../lib/output.js";

function collectOption(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

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
    categoryId: asset.categoryId,
    createdAt: asset.createdAt,
    summary: asset.summary,
    fields: asset.fields.slice(0, 120),
    entities: asset.entities.slice(0, 40),
    rawText: asset.rawOcrText?.slice(0, 4000)
  };
}

function formatAskAnswer(answer: string): string {
  return answer
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function registerAskCommand(program: Command): void {
  program
    .command("ask [question...]")
    .description("Ask Copilot questions over selected assets/categories")
    .option("--asset <assetId>", "Asset id (repeatable)", collectOption, [])
    .option("--category <category>", "Category scope (repeatable)", collectOption, [])
    .option("--all", "Use all assets")
    .option("--since <duration>", "Time window (e.g. 5d, 2w, 2m, 1y)")
    .option("--json", "Output JSON")
    .option("--quiet", "Minimal output")
    .action(
      withErrorHandling(
        async (
          questionParts: string[],
          options: {
            asset: string[];
            category: string[];
            all?: boolean;
            since?: string;
            json?: boolean;
            quiet?: boolean;
          }
        ) => {
          const question = questionParts.join(" ").trim();
          if (!question) {
            throw new Error("Provide a question. Example: vault ask --all how much did i spend total");
          }

          const config = await getConfig();
          const token = await getAccessToken();
          const client = new ApiClient(config.apiBaseUrl, token);
          const categories = await client.listCategories();
          const selectedById = new Map<string, Asset>();

          if (options.asset.length === 0 && options.category.length === 0 && !options.all) {
            throw new Error("Choose scope with --asset, --category, or --all");
          }

          for (const assetId of options.asset) {
            const asset = await client.getAsset(assetId);
            selectedById.set(asset.id, asset);
          }

          for (const categoryInput of options.category) {
            const category = resolveCategory(categories, categoryInput);
            const assets = await listCategoryAssets(client, category.id);
            for (const asset of assets) {
              selectedById.set(asset.id, asset);
            }
          }

          if (options.all) {
            const assets = await listCategoryAssets(client, "");
            for (const asset of assets) {
              selectedById.set(asset.id, asset);
            }
          }

          const since = parseSinceWindow(options.since);
          const scopedAssets = [...selectedById.values()].filter((asset) =>
            since ? new Date(asset.createdAt).getTime() >= since.getTime() : true
          );
          if (scopedAssets.length === 0) {
            throw new Error("No assets matched the selected scope and time window");
          }

          const categoryById = categories.reduce<Record<string, string>>((acc, category) => {
            acc[category.id] = category.slug;
            return acc;
          }, {});

          const prompt = [
            "Answer the user's question using only the provided ScanVault asset data.",
            "If there is insufficient data, say exactly what is missing.",
            "Show calculations when totals are requested.",
            "Return plain English only (no markdown or bullets).",
            `Question: ${question}`,
            `Time window: ${options.since ?? "all time"}.`,
            "Asset data JSON:",
            JSON.stringify(
              scopedAssets.map((asset) => ({
                ...formatAssetForPrompt(asset),
                category: categoryById[asset.categoryId] ?? asset.categoryId
              }))
            )
          ].join("\n");

          const answer = await runCopilotChat(prompt, {
            system: "You are ScanVault Copilot QA. Be precise and cite asset ids when relevant."
          });

          if (options.json) {
            printOutput(
              {
                question,
                since: options.since ?? null,
                assetCount: scopedAssets.length,
                assetIds: scopedAssets.map((asset) => asset.id),
                answer
              },
              { json: true, quiet: options.quiet }
            );
            return;
          }

          printOutput(formatAskAnswer(answer), { quiet: options.quiet });
        }
      )
    );
}
