import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { updateAssetCategorySchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAssetById, getCategoryById, upsertAsset } from "../../services/cosmos.js";

export async function updateAssetCategoryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const assetId = request.params.id;
    if (!assetId) {
      throw new HttpError(400, "VALIDATION_ERROR", "Asset id is required");
    }

    const body = updateAssetCategorySchema.parse(await request.json());

    const [asset, category] = await Promise.all([
      getAssetById(auth.userId, assetId),
      getCategoryById(auth.userId, body.categoryId)
    ]);

    if (!asset) {
      throw new HttpError(404, "NOT_FOUND", "Asset not found");
    }

    if (!category) {
      throw new HttpError(404, "NOT_FOUND", "Category not found");
    }

    if (asset.categoryId === category.id) {
      return success(asset);
    }

    const updatedAsset = {
      ...asset,
      categoryId: category.id,
      updatedAt: new Date().toISOString()
    };

    await upsertAsset(updatedAsset);

    return success(updatedAsset);
  } catch (error) {
    return errorResponse(error, context);
  }
}
