import { updateCategorySchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getCategoryById, upsertCategory } from "../../services/cosmos.js";
function toSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}
export async function updateCategoryHandler(request, context) {
    try {
        const auth = await requireAuth(request);
        const categoryId = request.params.id;
        if (!categoryId) {
            throw new HttpError(400, "VALIDATION_ERROR", "Category id is required");
        }
        const body = updateCategorySchema.parse(await request.json());
        if (!body.name && !body.fieldPriorities) {
            throw new HttpError(400, "VALIDATION_ERROR", "At least one field must be provided");
        }
        const existing = await getCategoryById(auth.userId, categoryId);
        if (!existing) {
            throw new HttpError(404, "NOT_FOUND", "Category not found");
        }
        const updated = {
            ...existing,
            ...(body.name ? { name: body.name, slug: toSlug(body.name) } : {}),
            ...(body.fieldPriorities ? { fieldPriorities: body.fieldPriorities } : {}),
            updatedAt: new Date().toISOString()
        };
        await upsertCategory(updated);
        return success(updated);
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=update.js.map