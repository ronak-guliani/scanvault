import { CosmosClient } from "@azure/cosmos";
import { randomUUID } from "node:crypto";
import { DEFAULT_CATEGORIES } from "@scanvault/shared";
import { appConfig, getCosmosConnectionString } from "../config/index.js";
import { HttpError } from "../http/errors.js";
import { userContainerName } from "./blob.js";
let cosmosClient;
function getCosmosClient() {
    if (!cosmosClient) {
        cosmosClient = new CosmosClient(getCosmosConnectionString());
    }
    return cosmosClient;
}
function database() {
    return getCosmosClient().database(appConfig.cosmosDatabaseName);
}
function assetsContainer() {
    return database().container(appConfig.assetsContainerName);
}
function categoriesContainer() {
    return database().container(appConfig.categoriesContainerName);
}
function usersContainer() {
    return database().container(appConfig.usersContainerName);
}
function isNotFound(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === 404;
}
export async function upsertAsset(asset) {
    await assetsContainer().items.upsert(asset);
}
export async function getAssetById(userId, id) {
    try {
        const { resource } = await assetsContainer().item(id, userId).read();
        return resource ?? null;
    }
    catch (error) {
        if (isNotFound(error)) {
            return null;
        }
        throw error;
    }
}
export async function getAssetsByIds(userId, ids) {
    if (ids.length === 0) {
        return [];
    }
    const idClauses = ids.map((_, index) => `@id${index}`);
    const parameters = [{ name: "@userId", value: userId }];
    ids.forEach((id, index) => parameters.push({ name: `@id${index}`, value: id }));
    const querySpec = {
        query: `SELECT * FROM c WHERE c.userId = @userId AND c.id IN (${idClauses.join(", ")})`,
        parameters
    };
    const { resources } = await assetsContainer().items.query(querySpec).fetchAll();
    return resources;
}
export async function listAssets(userId, options) {
    const clauses = ["c.userId = @userId"];
    const parameters = [{ name: "@userId", value: userId }];
    if (options.categoryId) {
        clauses.push("c.categoryId = @categoryId");
        parameters.push({ name: "@categoryId", value: options.categoryId });
    }
    if (options.status) {
        clauses.push("c.status = @status");
        parameters.push({ name: "@status", value: options.status });
    }
    const querySpec = {
        query: `SELECT * FROM c WHERE ${clauses.join(" AND ")} ORDER BY c.createdAt DESC`,
        parameters
    };
    const iterator = assetsContainer().items.query(querySpec, {
        maxItemCount: options.limit,
        continuationToken: options.continuationToken
    });
    const { resources, continuationToken } = await iterator.fetchNext();
    return {
        items: resources,
        continuationToken: continuationToken ?? undefined
    };
}
export async function searchAssets(userId, options) {
    const clauses = ["c.userId = @userId"];
    const parameters = [{ name: "@userId", value: userId }];
    if (options.categoryId) {
        clauses.push("c.categoryId = @categoryId");
        parameters.push({ name: "@categoryId", value: options.categoryId });
    }
    if (options.parsedQuery.entityFilter) {
        clauses.push("EXISTS(SELECT VALUE e FROM e IN c.entities WHERE CONTAINS(LOWER(e), @entityFilter))");
        parameters.push({ name: "@entityFilter", value: options.parsedQuery.entityFilter.toLowerCase() });
    }
    options.parsedQuery.keywords.forEach((keyword, index) => {
        const tokenName = `@keyword${index}`;
        clauses.push(`(CONTAINS(LOWER(c.summary), ${tokenName}) OR CONTAINS(LOWER(c.rawOcrText), ${tokenName}))`);
        parameters.push({ name: tokenName, value: keyword.toLowerCase() });
    });
    options.parsedQuery.fieldFilters.forEach((filter, index) => {
        const keyParam = `@fieldKey${index}`;
        const valueParam = `@fieldValue${index}`;
        parameters.push({ name: keyParam, value: filter.key });
        parameters.push({ name: valueParam, value: filter.value });
        if (filter.operator === ":") {
            clauses.push(`EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND CONTAINS(LOWER(TO_STRING(f.value)), LOWER(${valueParam})))`);
            return;
        }
        if (filter.operator === "=") {
            clauses.push(`EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND (f.value = ${valueParam} OR LOWER(TO_STRING(f.value)) = LOWER(${valueParam})))`);
            return;
        }
        clauses.push(`EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND IS_NUMBER(f.value) AND f.value ${filter.operator} ${valueParam})`);
    });
    const querySpec = {
        query: `SELECT * FROM c WHERE ${clauses.join(" AND ")} ORDER BY c.createdAt DESC`,
        parameters
    };
    const iterator = assetsContainer().items.query(querySpec, {
        maxItemCount: options.limit
    });
    const { resources } = await iterator.fetchNext();
    return resources;
}
export async function deleteAsset(userId, id) {
    await assetsContainer().item(id, userId).delete();
}
export async function listCategories(userId) {
    const { resources } = await categoriesContainer()
        .items.query({
        query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.name ASC",
        parameters: [{ name: "@userId", value: userId }]
    })
        .fetchAll();
    return resources;
}
export async function getCategoryById(userId, id) {
    try {
        const { resource } = await categoriesContainer().item(id, userId).read();
        return resource ?? null;
    }
    catch (error) {
        if (isNotFound(error)) {
            return null;
        }
        throw error;
    }
}
export async function getCategoryBySlug(userId, slug) {
    const { resources } = await categoriesContainer()
        .items.query({
        query: "SELECT * FROM c WHERE c.userId = @userId AND c.slug = @slug",
        parameters: [
            { name: "@userId", value: userId },
            { name: "@slug", value: slug }
        ]
    })
        .fetchAll();
    return resources[0] ?? null;
}
export async function upsertCategory(category) {
    await categoriesContainer().items.upsert(category);
}
export async function ensureCategoryBySlug(userId, slug, fallbackName) {
    const existing = await getCategoryBySlug(userId, slug);
    if (existing) {
        return existing;
    }
    const now = new Date().toISOString();
    const name = fallbackName ?? slug.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
    const category = {
        id: randomUUID(),
        userId,
        name,
        slug,
        isDefault: false,
        fieldPriorities: [],
        assetCount: 0,
        createdAt: now,
        updatedAt: now
    };
    await upsertCategory(category);
    return category;
}
export async function deleteCategory(userId, id) {
    await categoriesContainer().item(id, userId).delete();
}
export async function ensureDefaultCategories(userId) {
    const existing = await listCategories(userId);
    if (existing.length > 0) {
        return existing;
    }
    const now = new Date().toISOString();
    for (const category of DEFAULT_CATEGORIES) {
        await upsertCategory({
            id: randomUUID(),
            userId,
            name: category.name,
            slug: category.slug,
            isDefault: true,
            fieldPriorities: category.fieldPriorities,
            assetCount: 0,
            createdAt: now,
            updatedAt: now
        });
    }
    return listCategories(userId);
}
export async function reassignAssetCategory(userId, fromCategoryId, toCategoryId) {
    const { resources } = await assetsContainer()
        .items.query({
        query: "SELECT * FROM c WHERE c.userId = @userId AND c.categoryId = @fromCategoryId",
        parameters: [
            { name: "@userId", value: userId },
            { name: "@fromCategoryId", value: fromCategoryId }
        ]
    })
        .fetchAll();
    const now = new Date().toISOString();
    for (const asset of resources) {
        await upsertAsset({
            ...asset,
            categoryId: toCategoryId,
            updatedAt: now
        });
    }
}
export async function getUserSettings(userId) {
    try {
        const { resource } = await usersContainer().item(userId, userId).read();
        return resource ?? null;
    }
    catch (error) {
        if (isNotFound(error)) {
            return null;
        }
        throw error;
    }
}
export async function getOrCreateUserSettings(user) {
    const existing = await getUserSettings(user.userId);
    if (existing) {
        return existing;
    }
    const now = new Date().toISOString();
    const created = {
        id: user.userId,
        email: user.email ?? "",
        displayName: user.name ?? "",
        extractionMode: "ocr",
        blobContainerName: userContainerName(user.userId),
        createdAt: now,
        updatedAt: now
    };
    await usersContainer().items.upsert(created);
    return created;
}
export async function upsertUserSettings(settings) {
    await usersContainer().items.upsert(settings);
}
export async function markAssetFailed(userId, assetId, errorMessage) {
    const asset = await getAssetById(userId, assetId);
    if (!asset) {
        throw new HttpError(404, "NOT_FOUND", "Asset not found while marking failure");
    }
    await upsertAsset({
        ...asset,
        status: "failed",
        errorMessage,
        updatedAt: new Date().toISOString()
    });
}
//# sourceMappingURL=cosmos.js.map