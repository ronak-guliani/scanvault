import type { Asset, Category, ClientExtractionResult, UserSettings } from "@scanvault/shared";
interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    pagination?: {
        continuationToken?: string;
        totalCount?: number;
    };
}
interface AuthCallbackResponse {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}
export declare class ApiClient {
    private readonly baseUrl;
    private token?;
    constructor(baseUrl: string, token?: string | undefined);
    private createUrl;
    private request;
    private tryRefreshToken;
    uploadFile(filePath: string, options?: {
        extracted?: ClientExtractionResult;
    }): Promise<{
        assetId: string;
        status: string;
        categoryId?: string;
        categorySlug?: string;
    }>;
    getAuthLoginUrl(params: {
        redirectUri: string;
        state?: string;
        codeChallenge?: string;
    }): Promise<string>;
    exchangeAuthCode(payload: {
        code: string;
        redirectUri: string;
        codeVerifier?: string;
    }): Promise<AuthCallbackResponse>;
    listAssets(params: {
        category?: string;
        status?: string;
        limit?: number;
        continuationToken?: string;
    }): Promise<ApiEnvelope<Asset[]>>;
    getAsset(id: string): Promise<Asset>;
    search(query: string, limit?: number): Promise<unknown>;
    listCategories(): Promise<Category[]>;
    createCategory(name: string): Promise<unknown>;
    getSettings(): Promise<UserSettings>;
    updateSettings(patch: Record<string, unknown>): Promise<unknown>;
}
export {};
