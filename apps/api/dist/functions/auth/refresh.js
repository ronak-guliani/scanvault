import { z } from "zod";
import { errorResponse, success } from "../../http/response.js";
import { refreshAccessToken } from "../../services/b2c.js";
const refreshSchema = z.object({
    refreshToken: z.string().min(1)
});
export async function authRefreshHandler(request, context) {
    try {
        const body = refreshSchema.parse(await request.json());
        const token = await refreshAccessToken(body.refreshToken);
        return success({
            accessToken: token.access_token,
            refreshToken: token.refresh_token ?? body.refreshToken,
            expiresIn: token.expires_in
        });
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=refresh.js.map