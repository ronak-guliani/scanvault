import type { Asset } from "@scanvault/shared";
import type { Command } from "commander";
import { getAccessToken } from "../lib/auth.js";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig } from "../lib/config.js";
import { printOutput } from "../lib/output.js";

async function resolveAsset(client: ApiClient, identifier: string): Promise<Asset> {
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

export function registerGetCommand(program: Command): void {
  program
    .command("get <assetId>")
    .description("Get a single asset by id or 'latest'")
    .option("--json", "Output JSON")
    .option("--quiet", "Minimal output")
    .action(
      withErrorHandling(async (assetId: string, options: { json?: boolean; quiet?: boolean }) => {
        const config = await getConfig();
        const token = await getAccessToken();
        const client = new ApiClient(config.apiBaseUrl, token);

        const asset = await resolveAsset(client, assetId);
        printOutput(asset, { json: options.json, quiet: options.quiet });
      })
    );
}
