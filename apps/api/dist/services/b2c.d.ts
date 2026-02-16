interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
}
export declare function buildAuthorizationUrl(options: {
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
}): string;
export declare function exchangeAuthorizationCode(code: string, redirectUri: string, codeVerifier?: string): Promise<TokenResponse>;
export declare function refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
export {};
