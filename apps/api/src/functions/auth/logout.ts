import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { errorResponse, success } from "../../http/response.js";

export async function authLogoutHandler(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    return success({ loggedOut: true });
  } catch (error) {
    return errorResponse(error, context);
  }
}
