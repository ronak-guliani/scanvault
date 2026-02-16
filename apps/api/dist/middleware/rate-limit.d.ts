type LimitScope = "api" | "search" | "upload-minute" | "upload-day";
export declare function enforceRateLimit(userId: string, scope: LimitScope): Promise<void>;
export {};
