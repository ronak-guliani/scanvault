import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { ensureDefaultCategories } from "../../services/cosmos.js";
export async function listCategoriesHandler(request, context) {
    try {
        const auth = await requireAuth(request);
        const categories = await ensureDefaultCategories(auth.userId);
        return success(categories);
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=list.js.map