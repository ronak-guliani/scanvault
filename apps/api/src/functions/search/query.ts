import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseSearchQuery } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { enforceRateLimit } from "../../middleware/rate-limit.js";
import { listCategories } from "../../services/cosmos.js";
import { runAssetSearch } from "../../services/search.js";
import { interpretSearchQuery } from "../../services/llm-search.js";

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
    const explicitCategoryFilter = request.query.get("category")?.trim().toLowerCase();

    const categories = await listCategories(auth.userId);
    let llmResult;
    try {
      llmResult = await interpretSearchQuery(q, categories);
    } catch (error) {
      context.warn(`LLM search fallback for user ${auth.userId}: ${error instanceof Error ? error.message : String(error)}`);
      llmResult = {
        type: "search" as const,
        parsedQuery: parseSearchQuery(q)
      };
    }

    if (llmResult.type === "answer") {
      return success({
        type: "answer" as const,
        message: llmResult.message,
        items: []
      });
    }

    let categoryId: string | undefined;
    const categorySlug = explicitCategoryFilter ?? llmResult.categorySlug ?? llmResult.parsedQuery.categoryFilter;
    const parsedQuery = {
      ...llmResult.parsedQuery,
      categoryFilter: categorySlug
    };
    if (categorySlug) {
      categoryId = categories.find((c) => c.slug === categorySlug.toLowerCase())?.id;
    }

    const result = await runAssetSearch(auth.userId, parsedQuery, { limit, categoryId });
    return success({
      type: "search" as const,
      query: result.parsedQuery,
      items: result.items
    });
  } catch (error) {
    return errorResponse(error, context);
  }
}
