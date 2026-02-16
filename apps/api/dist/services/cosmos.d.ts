import type { Asset, Category, ParsedQuery, UserSettings } from "@scanvault/shared";
export declare function upsertAsset(asset: Asset): Promise<void>;
export declare function getAssetById(userId: string, id: string): Promise<Asset | null>;
export declare function getAssetsByIds(userId: string, ids: string[]): Promise<Asset[]>;
export declare function listAssets(userId: string, options: {
    categoryId?: string;
    status?: string;
    limit: number;
    continuationToken?: string;
}): Promise<{
    items: Asset[];
    continuationToken?: string;
}>;
export declare function searchAssets(userId: string, options: {
    parsedQuery: ParsedQuery;
    categoryId?: string;
    limit: number;
}): Promise<Asset[]>;
export declare function deleteAsset(userId: string, id: string): Promise<void>;
export declare function listCategories(userId: string): Promise<Category[]>;
export declare function getCategoryById(userId: string, id: string): Promise<Category | null>;
export declare function getCategoryBySlug(userId: string, slug: string): Promise<Category | null>;
export declare function upsertCategory(category: Category): Promise<void>;
export declare function ensureCategoryBySlug(userId: string, slug: string, fallbackName?: string): Promise<Category>;
export declare function deleteCategory(userId: string, id: string): Promise<void>;
export declare function ensureDefaultCategories(userId: string): Promise<Category[]>;
export declare function reassignAssetCategory(userId: string, fromCategoryId: string, toCategoryId: string): Promise<void>;
export declare function getUserSettings(userId: string): Promise<UserSettings | null>;
export declare function getOrCreateUserSettings(user: {
    userId: string;
    email?: string;
    name?: string;
}): Promise<UserSettings>;
export declare function upsertUserSettings(settings: UserSettings): Promise<void>;
export declare function markAssetFailed(userId: string, assetId: string, errorMessage: string): Promise<void>;
