import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  deleteAsset,
  deleteCategory,
  getCategoryById,
  listAssetsByCategory
} from "../../services/cosmos.js";
import { deleteBlobByPath } from "../../services/blob.js";

export async function deleteCategoryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const categoryId = request.params.id;
    if (!categoryId) {
      throw new HttpError(400, "VALIDATION_ERROR", "Category id is required");
    }

    const target = await getCategoryById(auth.userId, categoryId);
    if (!target) {
      throw new HttpError(404, "NOT_FOUND", "Category not found");
    }

    if (target.slug === "general") {
      throw new HttpError(400, "VALIDATION_ERROR", "General category cannot be deleted");
    }

    const categoryAssets = await listAssetsByCategory(auth.userId, categoryId);
    for (const asset of categoryAssets) {
      await deleteBlobByPath(asset.originalBlobUrl);
      for (const normalizedBlobUrl of asset.normalizedBlobUrls) {
        await deleteBlobByPath(normalizedBlobUrl);
      }
      await deleteAsset(auth.userId, asset.id);
    }

    await deleteCategory(auth.userId, categoryId);

    return success({ deleted: true, deletedAssets: categoryAssets.length });
  } catch (error) {
    return errorResponse(error, context);
  }
}
