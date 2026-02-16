import type { HttpResponseInit, InvocationContext } from "@azure/functions";
export declare function success<T>(data: T, status?: number, pagination?: {
    continuationToken?: string;
}): HttpResponseInit;
export declare function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit;
