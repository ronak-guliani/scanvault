import { getRequiredEnv } from "../config/index.js";
function getOAuthConfig() {
    return {
        authorizationEndpoint: getRequiredEnv("B2C_AUTHORIZATION_ENDPOINT"),
        tokenEndpoint: getRequiredEnv("B2C_TOKEN_ENDPOINT"),
        clientId: getRequiredEnv("B2C_CLIENT_ID"),
        clientSecret: getRequiredEnv("B2C_CLIENT_SECRET"),
        scope: process.env.B2C_SCOPE ?? "openid offline_access"
    };
}
export function buildAuthorizationUrl(options) {
    const config = getOAuthConfig();
    const url = new URL(config.authorizationEndpoint);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", options.redirectUri);
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("response_mode", "query");
    if (options.state) {
        url.searchParams.set("state", options.state);
    }
    if (options.codeChallenge) {
        url.searchParams.set("code_challenge", options.codeChallenge);
        url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
}
async function exchangeToken(form) {
    const config = getOAuthConfig();
    form.set("client_id", config.clientId);
    form.set("client_secret", config.clientSecret);
    const response = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form
    });
    const json = (await response.json().catch(() => ({})));
    if (!response.ok || !json.access_token) {
        throw new Error(json.error_description ?? `Token exchange failed: ${response.status}`);
    }
    return json;
}
export async function exchangeAuthorizationCode(code, redirectUri, codeVerifier) {
    const form = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
    });
    if (codeVerifier) {
        form.set("code_verifier", codeVerifier);
    }
    return exchangeToken(form);
}
export async function refreshAccessToken(refreshToken) {
    const form = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });
    return exchangeToken(form);
}
//# sourceMappingURL=b2c.js.map