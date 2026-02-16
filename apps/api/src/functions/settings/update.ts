import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { updateSettingsSchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getOrCreateUserSettings, upsertUserSettings } from "../../services/cosmos.js";
import { setUserAIKey } from "../../services/keyvault.js";

export async function updateSettingsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const body = updateSettingsSchema.parse(await request.json());

    const currentSettings = await getOrCreateUserSettings(auth);
    const aiKeyVaultRef = body.apiKey ? await setUserAIKey(auth.userId, body.apiKey) : currentSettings.aiKeyVaultRef;

    if ((body.extractionMode === "ai" || currentSettings.extractionMode === "ai") && !body.aiProvider && !currentSettings.aiProvider) {
      throw new HttpError(400, "VALIDATION_ERROR", "aiProvider is required when extraction mode is ai");
    }

    const updatedSettings = {
      ...currentSettings,
      ...(body.extractionMode ? { extractionMode: body.extractionMode } : {}),
      ...(body.aiProvider ? { aiProvider: body.aiProvider } : {}),
      aiKeyVaultRef,
      updatedAt: new Date().toISOString()
    };

    await upsertUserSettings(updatedSettings);
    return success(updatedSettings);
  } catch (error) {
    return errorResponse(error, context);
  }
}
