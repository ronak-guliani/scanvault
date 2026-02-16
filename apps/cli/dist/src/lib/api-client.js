import { basename } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { clearCredentials, getCredentials, setCredentials } from "./config.js";
function inferMimeType(fileName) {
    const normalized = fileName.toLowerCase();
    if (normalized.endsWith(".png"))
        return "image/png";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg"))
        return "image/jpeg";
    if (normalized.endsWith(".webp"))
        return "image/webp";
    if (normalized.endsWith(".pdf"))
        return "application/pdf";
    return "application/octet-stream";
}
export class ApiClient {
    baseUrl;
    token;
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    createUrl(path, query) {
        const base = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`;
        const url = new URL(path.replace(/^\//, ""), base);
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined && value !== "") {
                    url.searchParams.set(key, String(value));
                }
            }
        }
        return url.toString();
    }
    async request(method, path, options = {}) {
        const headers = {
            Accept: "application/json"
        };
        if (options.withAuth ?? true) {
            if (!this.token) {
                const credentials = await getCredentials();
                this.token = credentials?.accessToken;
            }
            if (this.token) {
                headers.Authorization = `Bearer ${this.token}`;
            }
        }
        let body;
        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.body);
        }
        const response = await fetch(this.createUrl(path, options.query), {
            method,
            headers,
            body
        });
        const json = (await response.json().catch(() => ({})));
        if (response.status === 401 && !options.skipRefreshRetry && (options.withAuth ?? true)) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                return this.request(method, path, {
                    ...options,
                    skipRefreshRetry: true
                });
            }
        }
        if (!response.ok || json.success === false) {
            const code = json.error?.code;
            const message = json.error?.message ?? `${response.status} ${response.statusText}`;
            const fullMessage = code ? `${code}: ${message}` : message;
            if (response.status === 401 && (options.withAuth ?? true)) {
                await clearCredentials();
            }
            throw new Error(fullMessage);
        }
        return json;
    }
    async tryRefreshToken() {
        const credentials = await getCredentials();
        if (!credentials?.refreshToken) {
            return false;
        }
        const response = await fetch(this.createUrl("/auth/refresh"), {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refreshToken: credentials.refreshToken })
        });
        const json = (await response.json().catch(() => ({})));
        if (!response.ok || json.success === false || !json.data?.accessToken) {
            await clearCredentials();
            return false;
        }
        const refreshed = json.data;
        const expiresAt = typeof refreshed.expiresIn === "number" ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString() : credentials.expiresAt;
        await setCredentials({
            ...credentials,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? credentials.refreshToken,
            expiresAt,
            updatedAt: new Date().toISOString()
        });
        this.token = refreshed.accessToken;
        return true;
    }
    async uploadFile(filePath, options) {
        const metadata = await stat(filePath);
        const fileName = basename(filePath);
        const mimeType = inferMimeType(fileName);
        const fileBuffer = await readFile(filePath);
        const uploadInit = await this.request("POST", "/assets/upload", {
            body: {
                fileName,
                mimeType,
                fileSize: metadata.size
            }
        });
        const uploadData = uploadInit.data;
        if (!uploadData) {
            throw new Error("Upload initialization failed");
        }
        const uploadResponse = await fetch(uploadData.sasUploadUrl, {
            method: "PUT",
            headers: {
                "x-ms-blob-type": "BlockBlob",
                "Content-Type": mimeType
            },
            body: fileBuffer
        });
        if (!uploadResponse.ok) {
            throw new Error(`Blob upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        const confirm = await this.request("POST", "/assets/upload/confirm", {
            body: options?.extracted
                ? {
                    assetId: uploadData.assetId,
                    extracted: options.extracted
                }
                : { assetId: uploadData.assetId }
        });
        if (!confirm.data) {
            throw new Error("Upload confirmation failed");
        }
        return confirm.data;
    }
    async getAuthLoginUrl(params) {
        const response = await this.request("GET", "/auth/login", {
            query: {
                redirectUri: params.redirectUri,
                state: params.state,
                codeChallenge: params.codeChallenge
            },
            withAuth: false
        });
        if (!response.data?.redirectUrl) {
            throw new Error("Auth login URL not returned by API");
        }
        return response.data.redirectUrl;
    }
    async exchangeAuthCode(payload) {
        const response = await this.request("POST", "/auth/callback", {
            body: payload,
            withAuth: false
        });
        if (!response.data?.accessToken) {
            throw new Error("Auth callback did not return access token");
        }
        return response.data;
    }
    async listAssets(params) {
        return this.request("GET", "/assets", {
            query: {
                category: params.category,
                status: params.status,
                limit: params.limit,
                continuationToken: params.continuationToken
            }
        });
    }
    async getAsset(id) {
        const response = await this.request("GET", `/assets/${id}`);
        if (!response.data) {
            throw new Error("Asset not found");
        }
        return response.data;
    }
    async search(query, limit) {
        const response = await this.request("GET", "/search", {
            query: {
                q: query,
                limit
            }
        });
        return response.data ?? response;
    }
    async listCategories() {
        const response = await this.request("GET", "/categories");
        return response.data ?? [];
    }
    async createCategory(name) {
        const response = await this.request("POST", "/categories", {
            body: {
                name,
                fieldPriorities: []
            }
        });
        return response.data ?? response;
    }
    async getSettings() {
        const response = await this.request("GET", "/settings");
        if (!response.data) {
            throw new Error("Settings not found");
        }
        return response.data;
    }
    async updateSettings(patch) {
        const response = await this.request("PATCH", "/settings", {
            body: patch
        });
        return response.data ?? response;
    }
}
//# sourceMappingURL=api-client.js.map