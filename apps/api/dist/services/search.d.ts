import type { Asset } from "@scanvault/shared";
import type { ParsedQuery } from "@scanvault/shared";
import { searchAssets } from "./cosmos.js";
export declare function indexAssetForSearch(asset: Asset): Promise<void>;
export declare function runAssetSearch(userId: string, query: string, options: {
    categoryId?: string;
    limit: number;
}): Promise<{
    parsedQuery: ParsedQuery;
    items: Awaited<ReturnType<typeof searchAssets>>;
}>;
