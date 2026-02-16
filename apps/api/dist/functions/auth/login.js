import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { buildAuthorizationUrl } from "../../services/b2c.js";
export async function authLoginHandler(request, context) {
    try {
        const redirectUri = request.query.get("redirectUri");
        if (!redirectUri) {
            throw new HttpError(400, "VALIDATION_ERROR", "redirectUri query parameter is required");
        }
        const state = request.query.get("state") ?? undefined;
        const codeChallenge = request.query.get("codeChallenge") ?? undefined;
        const redirectUrl = buildAuthorizationUrl({
            redirectUri,
            state,
            codeChallenge
        });
        return success({ redirectUrl });
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=login.js.map