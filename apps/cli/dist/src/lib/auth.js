import { getCredentials } from "./config.js";
export async function getAccessToken() {
    const credentials = await getCredentials();
    if (!credentials?.accessToken) {
        throw new Error("Not logged in. Run `vault login` first.");
    }
    return credentials.accessToken;
}
export function decodeJwtPayload(token) {
    const parts = token.split(".");
    if (parts.length < 2) {
        throw new Error("Invalid JWT format");
    }
    const payload = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}
//# sourceMappingURL=auth.js.map