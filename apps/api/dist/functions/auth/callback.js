import { z } from "zod";
import { errorResponse, success } from "../../http/response.js";
import { exchangeAuthorizationCode, mintApiTokenFromOAuthToken } from "../../services/b2c.js";
const callbackSchema = z
    .object({
    code: z.string().min(1).optional(),
    redirectUri: z.string().url().optional(),
    codeVerifier: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    expiresIn: z.number().int().positive().optional()
})
    .refine((value) => Boolean(value.code) || Boolean(value.accessToken), {
    message: "Provide either code or accessToken"
});
export async function authCallbackHandler(request, context) {
    try {
        const body = callbackSchema.parse(await request.json());
        if (body.accessToken) {
            return success({
                accessToken: body.accessToken,
                refreshToken: body.refreshToken,
                expiresIn: body.expiresIn
            });
        }
        const token = await exchangeAuthorizationCode(body.code, body.redirectUri, body.codeVerifier);
        const apiToken = mintApiTokenFromOAuthToken(token.access_token);
        return success({
            accessToken: apiToken,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in
        });
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=callback.js.map