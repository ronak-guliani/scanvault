import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { listAssets } from "../../services/cosmos.js";
export async function listAssetsHandler(request, context) {
    try {
        const auth = await requireAuth(request);
        const limitRaw = request.query.get("limit");
        const limit = Math.min(Math.max(Number(limitRaw ?? "20"), 1), 100);
        const continuationToken = request.query.get("continuationToken") ?? undefined;
        const categoryId = request.query.get("category") ?? undefined;
        const status = request.query.get("status") ?? undefined;
        const result = await listAssets(auth.userId, {
            limit,
            continuationToken,
            categoryId,
            status
        });
        return success(result.items, 200, {
            continuationToken: result.continuationToken
        });
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=list.js.map