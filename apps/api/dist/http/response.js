import { ZodError } from "zod";
import { HttpError } from "./errors.js";
export function success(data, status = 200, pagination) {
    return {
        status,
        jsonBody: {
            success: true,
            data,
            ...(pagination ? { pagination } : {})
        }
    };
}
export function errorResponse(error, context) {
    if (error instanceof ZodError) {
        return {
            status: 400,
            jsonBody: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: error.issues.map((issue) => issue.message).join(", ")
                }
            }
        };
    }
    if (error instanceof HttpError) {
        return {
            status: error.status,
            jsonBody: {
                success: false,
                error: {
                    code: error.code,
                    message: error.message
                }
            }
        };
    }
    context.error(error);
    return {
        status: 500,
        jsonBody: {
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "Unexpected error"
            }
        }
    };
}
//# sourceMappingURL=response.js.map