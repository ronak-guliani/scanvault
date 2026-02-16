import type { HttpRequest } from "@azure/functions";
export interface AuthContext {
    userId: string;
    email?: string;
    name?: string;
}
export declare function requireAuth(request: HttpRequest): Promise<AuthContext>;
