import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { getOrCreateUserSettings } from "../../services/cosmos.js";
export async function getSettingsHandler(request, context) {
    try {
        const auth = await requireAuth(request);
        const settings = await getOrCreateUserSettings(auth);
        return success(settings);
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=get.js.map