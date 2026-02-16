import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getOrCreateUserSettings } from "../../services/cosmos.js";

export async function getSettingsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const settings = await getOrCreateUserSettings(auth);
    return success(settings);
  } catch (error) {
    return errorResponse(error, context);
  }
}
