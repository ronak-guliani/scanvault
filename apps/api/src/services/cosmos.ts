import { CosmosClient, type SqlQuerySpec } from "@azure/cosmos";
import { randomUUID } from "node:crypto";
import type { Asset, Category, ParsedQuery, UserSettings } from "@scanvault/shared";
import { DEFAULT_CATEGORIES } from "@scanvault/shared";
import { appConfig, getCosmosConnectionString } from "../config/index.js";
import { HttpError } from "../http/errors.js";
import { userContainerName } from "./blob.js";

let cosmosClient: CosmosClient | undefined;

function getCosmosClient(): CosmosClient {
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

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 404;
}

export async function upsertAsset(asset: Asset): Promise<void> {
  await assetsContainer().items.upsert(asset);
}

export async function getAssetById(userId: string, id: string): Promise<Asset | null> {
  try {
    const { resource } = await assetsContainer().item(id, userId).read<Asset>();
    return resource ?? null;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function getAssetsByIds(userId: string, ids: string[]): Promise<Asset[]> {
  if (ids.length === 0) {
    return [];
  }

  const idClauses = ids.map((_, index) => `@id${index}`);
  const parameters: Array<{ name: string; value: string }> = [{ name: "@userId", value: userId }];
  ids.forEach((id, index) => parameters.push({ name: `@id${index}`, value: id }));

  const querySpec: SqlQuerySpec = {
    query: `SELECT * FROM c WHERE c.userId = @userId AND c.id IN (${idClauses.join(", ")})`,
    parameters
  };

  const { resources } = await assetsContainer().items.query<Asset>(querySpec).fetchAll();
  return resources;
}

export async function listAssets(
  userId: string,
  options: { categoryId?: string; status?: string; limit: number; continuationToken?: string }
): Promise<{ items: Asset[]; continuationToken?: string }> {
  const clauses: string[] = ["c.userId = @userId"];
  const parameters: Array<{ name: string; value: string | number }> = [{ name: "@userId", value: userId }];

  if (options.categoryId) {
    clauses.push("c.categoryId = @categoryId");
    parameters.push({ name: "@categoryId", value: options.categoryId });
  }

  if (options.status) {
    clauses.push("c.status = @status");
    parameters.push({ name: "@status", value: options.status });
  }

  const querySpec: SqlQuerySpec = {
    query: `SELECT * FROM c WHERE ${clauses.join(" AND ")} ORDER BY c.createdAt DESC`,
    parameters
  };

  const iterator = assetsContainer().items.query<Asset>(querySpec, {
    maxItemCount: options.limit,
    continuationToken: options.continuationToken
  });

  const { resources, continuationToken } = await iterator.fetchNext();
  return {
    items: resources,
    continuationToken: continuationToken ?? undefined
  };
}

export async function searchAssets(
  userId: string,
  options: { parsedQuery: ParsedQuery; categoryId?: string; limit: number }
): Promise<Asset[]> {
  const clauses: string[] = ["c.userId = @userId"];
  const parameters: Array<{ name: string; value: string | number }> = [{ name: "@userId", value: userId }];

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
      clauses.push(
        `EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND CONTAINS(LOWER(TO_STRING(f.value)), LOWER(${valueParam})))`
      );
      return;
    }

    if (filter.operator === "=") {
      clauses.push(
        `EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND (f.value = ${valueParam} OR LOWER(TO_STRING(f.value)) = LOWER(${valueParam})))`
      );
      return;
    }

    clauses.push(
      `EXISTS(SELECT VALUE f FROM f IN c.fields WHERE f.key = ${keyParam} AND IS_NUMBER(f.value) AND f.value ${filter.operator} ${valueParam})`
    );
  });

  const querySpec: SqlQuerySpec = {
    query: `SELECT * FROM c WHERE ${clauses.join(" AND ")} ORDER BY c.createdAt DESC`,
    parameters
  };

  const iterator = assetsContainer().items.query<Asset>(querySpec, {
    maxItemCount: options.limit
  });
  const { resources } = await iterator.fetchNext();
  return resources;
}

export async function deleteAsset(userId: string, id: string): Promise<void> {
  await assetsContainer().item(id, userId).delete();
}

export async function listCategories(userId: string): Promise<Category[]> {
  const { resources } = await categoriesContainer()
    .items.query<Category>({
      query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.name ASC",
      parameters: [{ name: "@userId", value: userId }]
    })
    .fetchAll();

  return resources;
}

export async function getCategoryById(userId: string, id: string): Promise<Category | null> {
  try {
    const { resource } = await categoriesContainer().item(id, userId).read<Category>();
    return resource ?? null;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function getCategoryBySlug(userId: string, slug: string): Promise<Category | null> {
  const { resources } = await categoriesContainer()
    .items.query<Category>({
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.slug = @slug",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@slug", value: slug }
      ]
    })
    .fetchAll();

  return resources[0] ?? null;
}

export async function upsertCategory(category: Category): Promise<void> {
  await categoriesContainer().items.upsert(category);
}

export async function ensureCategoryBySlug(
  userId: string,
  slug: string,
  fallbackName?: string
): Promise<Category> {
  const existing = await getCategoryBySlug(userId, slug);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const name = fallbackName ?? slug.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
  const category: Category = {
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

export async function deleteCategory(userId: string, id: string): Promise<void> {
  await categoriesContainer().item(id, userId).delete();
}

export async function ensureDefaultCategories(userId: string): Promise<Category[]> {
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

export async function reassignAssetCategory(
  userId: string,
  fromCategoryId: string,
  toCategoryId: string
): Promise<void> {
  const { resources } = await assetsContainer()
    .items.query<Asset>({
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

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { resource } = await usersContainer().item(userId, userId).read<UserSettings>();
    return resource ?? null;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function getOrCreateUserSettings(user: {
  userId: string;
  email?: string;
  name?: string;
}): Promise<UserSettings> {
  const existing = await getUserSettings(user.userId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: UserSettings = {
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

export async function upsertUserSettings(settings: UserSettings): Promise<void> {
  await usersContainer().items.upsert(settings);
}

export async function markAssetFailed(userId: string, assetId: string, errorMessage: string): Promise<void> {
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
