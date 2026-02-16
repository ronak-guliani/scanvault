import type { Asset } from "@scanvault/shared";
import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import type { ParsedQuery } from "@scanvault/shared";
import { parseSearchQuery } from "@scanvault/shared";
import { getSearchConfig } from "../config/index.js";
import { getAssetsByIds, searchAssets } from "./cosmos.js";

interface SearchDocument {
  id: string;
  userId?: string;
  summary?: string;
  categoryId?: string;
  rawOcrText?: string;
  entities?: string[];
  fieldKeys?: string[];
  fieldValues?: string[];
  createdAt?: string;
}

function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}

async function searchAssetIdsByKeywords(userId: string, keywords: string[], limit: number): Promise<string[]> {
  if (keywords.length === 0) {
    return [];
  }

  const client = createSearchClient();
  if (!client) {
    return [];
  }
  const keywordText = keywords.join(" ");
  const response = await client.search(keywordText, {
    top: limit,
    select: ["id"],
    filter: `userId eq '${escapeFilterValue(userId)}'`
  });

  const ids: string[] = [];
  for await (const result of response.results) {
    if (result.document.id) {
      ids.push(result.document.id);
    }
  }
  return ids;
}

function createSearchClient(): SearchClient<SearchDocument> | null {
  const config = getSearchConfig();
  if (!config.endpoint || !config.apiKey) {
    return null;
  }

  return new SearchClient<SearchDocument>(config.endpoint, config.indexName, new AzureKeyCredential(config.apiKey));
}

export async function indexAssetForSearch(asset: Asset): Promise<void> {
  const client = createSearchClient();
  if (!client) {
    return;
  }

  const fieldKeys = asset.fields.map((field) => field.key);
  const fieldValues = asset.fields.map((field) => String(field.value));

  await client.mergeOrUploadDocuments([
    {
      id: asset.id,
      userId: asset.userId,
      summary: asset.summary,
      categoryId: asset.categoryId,
      rawOcrText: asset.rawOcrText,
      entities: asset.entities,
      fieldKeys,
      fieldValues,
      createdAt: asset.createdAt
    }
  ]);
}

export async function runAssetSearch(
  userId: string,
  query: string,
  options: { categoryId?: string; limit: number }
): Promise<{ parsedQuery: ParsedQuery; items: Awaited<ReturnType<typeof searchAssets>> }> {
  const parsedQuery = parseSearchQuery(query);
  const cosmosResults = await searchAssets(userId, {
    parsedQuery,
    categoryId: options.categoryId,
    limit: options.limit
  });

  const keywordIds = await searchAssetIdsByKeywords(userId, parsedQuery.keywords, options.limit);
  const keywordResults = await getAssetsByIds(userId, keywordIds);

  const merged = [...cosmosResults, ...keywordResults];
  const deduped = new Map<string, (typeof merged)[number]>();
  for (const asset of merged) {
    deduped.set(asset.id, asset);
  }

  const items = [...deduped.values()]
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, options.limit);

  return {
    parsedQuery,
    items
  };
}
