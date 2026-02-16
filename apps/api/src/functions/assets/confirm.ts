import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import type { Asset, ExtractionJob } from "@scanvault/shared";
import { uploadConfirmSchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  ensureCategoryBySlug,
  getAssetById,
  getOrCreateUserSettings,
  markAssetFailed,
  upsertAsset
} from "../../services/cosmos.js";
import { processExtractionJob } from "../../services/extraction.js";
import { enqueueExtractionJob } from "../../services/queue.js";
import { indexAssetForSearch } from "../../services/search.js";

const inlineExtractionEnabled = process.env.SCANVAULT_INLINE_EXTRACTION === "true";

function normalizeCategorySlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function confirmUploadHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const body = uploadConfirmSchema.parse(await request.json());

    const asset = await getAssetById(auth.userId, body.assetId);
    if (!asset) {
      throw new HttpError(404, "NOT_FOUND", "Asset not found");
    }

    if (body.extracted) {
      const now = new Date().toISOString();
      const categoryCandidate = body.extracted.categorySlug ?? body.extracted.categoryName ?? "general";
      const categorySlug = normalizeCategorySlug(categoryCandidate) || "general";
      const category = await ensureCategoryBySlug(auth.userId, categorySlug, body.extracted.categoryName);
      const normalizedBlobUrls =
        asset.normalizedBlobUrls.length > 0 ? asset.normalizedBlobUrls : [asset.originalBlobUrl];

      const readyAsset: Asset = {
        ...asset,
        normalizedBlobUrls,
        summary: body.extracted.summary.trim(),
        fields: body.extracted.fields.map((field) => ({
          key: field.key,
          value: field.value,
          unit: field.unit,
          confidence: field.confidence ?? 0.85,
          source: field.source ?? "ai"
        })),
        entities: [...new Set(body.extracted.entities.map((entity) => entity.trim()).filter(Boolean))],
        categoryId: category.id,
        extractionMode: "ai",
        extractionProvider: undefined,
        rawOcrText: body.extracted.rawText,
        status: "ready",
        errorMessage: undefined,
        updatedAt: now
      };

      await upsertAsset(readyAsset);
      try {
        await indexAssetForSearch(readyAsset);
      } catch (error) {
        context.warn(`Search indexing skipped for ${readyAsset.id}: ${error instanceof Error ? error.message : String(error)}`);
      }

      return success(
        {
          assetId: asset.id,
          status: "ready",
          categoryId: category.id,
          categorySlug
        },
        202
      );
    }

    const userSettings = await getOrCreateUserSettings(auth);
    const now = new Date().toISOString();

    await upsertAsset({
      ...asset,
      extractionMode: userSettings.extractionMode,
      extractionProvider: userSettings.aiProvider,
      status: "processing",
      errorMessage: undefined,
      updatedAt: now
    });

    const extractionJob: ExtractionJob = {
      assetId: asset.id,
      userId: auth.userId,
      blobPath: asset.originalBlobUrl,
      normalizedBlobPaths: asset.normalizedBlobUrls.length > 0 ? asset.normalizedBlobUrls : [asset.originalBlobUrl],
      extractionMode: userSettings.extractionMode,
      aiProvider: userSettings.aiProvider,
      aiKeyVaultRef: userSettings.aiKeyVaultRef,
      attemptNumber: 1
    };

    if (inlineExtractionEnabled) {
      try {
        await processExtractionJob(extractionJob);
        return success(
          {
            assetId: asset.id,
            status: "ready"
          },
          202
        );
      } catch (error) {
        await markAssetFailed(auth.userId, asset.id, error instanceof Error ? error.message : "Extraction failed");
        throw error;
      }
    }

    await enqueueExtractionJob(extractionJob);

    return success({
      assetId: asset.id,
      status: "processing"
    }, 202);
  } catch (error) {
    return errorResponse(error, context);
  }
}
