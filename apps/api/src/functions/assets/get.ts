import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getAssetById } from "../../services/cosmos.js";

export async function getAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const assetId = request.params.id;

    if (!assetId) {
      throw new HttpError(400, "VALIDATION_ERROR", "Asset id is required");
    }

    const asset = await getAssetById(auth.userId, assetId);
    if (!asset) {
      throw new HttpError(404, "NOT_FOUND", "Asset not found");
    }

    return success(asset);
  } catch (error) {
    return errorResponse(error, context);
  }
}
