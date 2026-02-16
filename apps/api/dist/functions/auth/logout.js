import { errorResponse, success } from "../../http/response.js";
export async function authLogoutHandler(_request, context) {
    try {
        return success({ loggedOut: true });
    }
    catch (error) {
        return errorResponse(error, context);
    }
}
//# sourceMappingURL=logout.js.map