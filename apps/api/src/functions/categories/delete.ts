import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  deleteCategory,
  ensureDefaultCategories,
  getCategoryById,
  reassignAssetCategory
} from "../../services/cosmos.js";

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

    const categories = await ensureDefaultCategories(auth.userId);
    const generalCategory = categories.find((category) => category.slug === "general");
    if (!generalCategory) {
      throw new HttpError(500, "INTERNAL_ERROR", "General category is missing");
    }

    if (generalCategory.id === categoryId) {
      throw new HttpError(400, "VALIDATION_ERROR", "General category cannot be deleted");
    }

    await reassignAssetCategory(auth.userId, categoryId, generalCategory.id);
    await deleteCategory(auth.userId, categoryId);

    return success({ deleted: true });
  } catch (error) {
    return errorResponse(error, context);
  }
}
