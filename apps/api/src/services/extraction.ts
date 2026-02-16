import { extractWithProvider } from "@scanvault/ai-extract";
import type { Asset, ExtractionJob } from "@scanvault/shared";
import { HttpError } from "../http/errors.js";
import { readBlobByPath } from "./blob.js";
import { ensureCategoryBySlug, getAssetById, upsertAsset } from "./cosmos.js";
import { getUserAIKey } from "./keyvault.js";
import { extractWithOCR } from "./ocr.js";
import { indexAssetForSearch } from "./search.js";

function normalizeCategorySlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function processExtractionJob(job: ExtractionJob): Promise<void> {
  const asset = await getAssetById(job.userId, job.assetId);
  if (!asset) {
    throw new HttpError(404, "NOT_FOUND", "Asset not found for extraction job");
  }

  const now = new Date().toISOString();
  const normalizedPaths = job.normalizedBlobPaths.length > 0 ? job.normalizedBlobPaths : [job.blobPath];
  const images = await Promise.all(normalizedPaths.map((path) => readBlobByPath(path)));

  let summary = `Document uploaded on ${now.slice(0, 10)}. Contains 0 extracted fields.`;
  let fields = asset.fields;
  let entities = asset.entities;
  let categoryId = asset.categoryId;
  let rawOcrText: string | undefined;

  if (job.extractionMode === "ai") {
    if (!job.aiProvider) {
      throw new HttpError(400, "VALIDATION_ERROR", "AI provider is required for ai extraction mode");
    }
    if (!job.aiKeyVaultRef) {
      throw new HttpError(400, "AI_KEY_INVALID", "AI key vault reference is required for ai extraction mode");
    }

    const apiKey = await getUserAIKey(job.aiKeyVaultRef);
    const result = await extractWithProvider(job.aiProvider, images, apiKey);
    summary = result.summary;
    fields = result.fields;
    entities = result.entities;

    const categorySlug = normalizeCategorySlug(result.suggestedCategory || "general") || "general";
    const category = await ensureCategoryBySlug(job.userId, categorySlug);
    categoryId = category.id;
  } else {
    const ocrResult = await extractWithOCR(images);
    summary = ocrResult.summary;
    fields = ocrResult.fields;
    entities = ocrResult.entities;
    rawOcrText = ocrResult.rawOcrText;

    const categorySlug = normalizeCategorySlug(ocrResult.suggestedCategory || "general") || "general";
    const category = await ensureCategoryBySlug(job.userId, categorySlug);
    categoryId = category.id;
  }

  const updatedAsset: Asset = {
    ...asset,
    normalizedBlobUrls: normalizedPaths,
    status: "ready",
    summary,
    fields,
    entities,
    categoryId,
    extractionMode: job.extractionMode,
    extractionProvider: job.aiProvider,
    rawOcrText,
    errorMessage: undefined,
    updatedAt: now
  };

  await upsertAsset(updatedAsset);
  try {
    await indexAssetForSearch(updatedAsset);
  } catch {
    // Search indexing is best-effort; extraction should still complete.
  }
}
