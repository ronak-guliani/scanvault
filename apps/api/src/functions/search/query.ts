import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { enforceRateLimit } from "../../middleware/rate-limit.js";
import { listCategories } from "../../services/cosmos.js";
import { runAssetSearch } from "../../services/search.js";

export async function searchAssetsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    await enforceRateLimit(auth.userId, "search");
    const q = request.query.get("q") ?? "";
    if (!q.trim()) {
      throw new HttpError(400, "VALIDATION_ERROR", "q query parameter is required");
    }

    const limitRaw = request.query.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw ?? "20"), 1), 100);

    const categoryFilter = request.query.get("category")?.toLowerCase();
    let categoryId: string | undefined;
    if (categoryFilter) {
      const categories = await listCategories(auth.userId);
      categoryId = categories.find((category) => category.slug === categoryFilter)?.id;
    }

    const result = await runAssetSearch(auth.userId, q, { limit, categoryId });
    return success({
      query: result.parsedQuery,
      items: result.items
    });
  } catch (error) {
    return errorResponse(error, context);
  }
}
