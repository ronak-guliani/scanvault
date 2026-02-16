import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { ZodError } from "zod";
import { HttpError } from "./errors.js";

export function success<T>(data: T, status = 200, pagination?: { continuationToken?: string }): HttpResponseInit {
  return {
    status,
    jsonBody: {
      success: true,
      data,
      ...(pagination ? { pagination } : {})
    }
  };
}

export function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
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
