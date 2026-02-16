import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { updateAssetExtractionSchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAssetById, getCategoryById, upsertAsset } from "../../services/cosmos.js";
import { indexAssetForSearch } from "../../services/search.js";

export async function updateAssetExtractionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const assetId = request.params.id;
    if (!assetId) {
      throw new HttpError(400, "VALIDATION_ERROR", "Asset id is required");
    }

    const body = updateAssetExtractionSchema.parse(await request.json());
    const asset = await getAssetById(auth.userId, assetId);
    if (!asset) {
      throw new HttpError(404, "NOT_FOUND", "Asset not found");
    }

    if (body.categoryId) {
      const category = await getCategoryById(auth.userId, body.categoryId);
      if (!category) {
        throw new HttpError(404, "NOT_FOUND", "Category not found");
      }
    }

    const updatedAsset = {
      ...asset,
      summary: body.summary ?? asset.summary,
      fields:
        body.fields?.map((field) => ({
          key: field.key,
          value: field.value,
          unit: field.unit,
          confidence: field.confidence ?? 0.85,
          source: field.source ?? "ai"
        })) ?? asset.fields,
      entities: body.entities ?? asset.entities,
      categoryId: body.categoryId ?? asset.categoryId,
      updatedAt: new Date().toISOString()
    };

    await upsertAsset(updatedAsset);
    try {
      await indexAssetForSearch(updatedAsset);
    } catch (error) {
      context.warn(`Search indexing skipped for ${updatedAsset.id}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return success(updatedAsset);
  } catch (error) {
    return errorResponse(error, context);
  }
}
