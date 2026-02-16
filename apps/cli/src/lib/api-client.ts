import { basename } from "node:path";
import { readFile, stat } from "node:fs/promises";
import type { Asset, Category, ClientExtractionResult, UserSettings } from "@scanvault/shared";
import { clearCredentials, getCredentials, setCredentials } from "./config.js";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: { continuationToken?: string; totalCount?: number };
}

interface UploadInitResponse {
  assetId: string;
  sasUploadUrl: string;
  blobPath: string;
}

interface AuthLoginResponse {
  redirectUrl: string;
}

interface AuthCallbackResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface AuthRefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

function inferMimeType(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export class ApiClient {
  constructor(private readonly baseUrl: string, private token?: string) {}

  private createUrl(path: string, query?: Record<string, string | number | undefined>): string {
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

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
      withAuth?: boolean;
      skipRefreshRetry?: boolean;
    } = {}
  ): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = {
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

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(this.createUrl(path, options.query), {
      method,
      headers,
      body
    });

    const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

    if (response.status === 401 && !options.skipRefreshRetry && (options.withAuth ?? true)) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(method, path, {
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

  private async tryRefreshToken(): Promise<boolean> {
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

    const json = (await response.json().catch(() => ({}))) as ApiEnvelope<AuthRefreshResponse>;
    if (!response.ok || json.success === false || !json.data?.accessToken) {
      await clearCredentials();
      return false;
    }

    const refreshed = json.data;
    const expiresAt =
      typeof refreshed.expiresIn === "number" ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString() : credentials.expiresAt;

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

  async uploadFile(
    filePath: string,
    options?: { extracted?: ClientExtractionResult }
  ): Promise<{ assetId: string; status: string; categoryId?: string; categorySlug?: string }> {
    const metadata = await stat(filePath);
    const fileName = basename(filePath);
    const mimeType = inferMimeType(fileName);
    const fileBuffer = await readFile(filePath);

    const uploadInit = await this.request<UploadInitResponse>("POST", "/assets/upload", {
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

    const confirm = await this.request<{ assetId: string; status: string; categoryId?: string; categorySlug?: string }>(
      "POST",
      "/assets/upload/confirm",
      {
        body: options?.extracted
          ? {
              assetId: uploadData.assetId,
              extracted: options.extracted
            }
          : { assetId: uploadData.assetId }
      }
    );

    if (!confirm.data) {
      throw new Error("Upload confirmation failed");
    }

    return confirm.data;
  }

  async getAuthLoginUrl(params: {
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
  }): Promise<string> {
    const response = await this.request<AuthLoginResponse>("GET", "/auth/login", {
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

  async exchangeAuthCode(payload: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<AuthCallbackResponse> {
    const response = await this.request<AuthCallbackResponse>("POST", "/auth/callback", {
      body: payload,
      withAuth: false
    });

    if (!response.data?.accessToken) {
      throw new Error("Auth callback did not return access token");
    }

    return response.data;
  }

  async listAssets(params: {
    category?: string;
    status?: string;
    limit?: number;
    continuationToken?: string;
  }): Promise<ApiEnvelope<Asset[]>> {
    return this.request<Asset[]>("GET", "/assets", {
      query: {
        category: params.category,
        status: params.status,
        limit: params.limit,
        continuationToken: params.continuationToken
      }
    });
  }

  async getAsset(id: string): Promise<Asset> {
    const response = await this.request<Asset>("GET", `/assets/${id}`);
    if (!response.data) {
      throw new Error("Asset not found");
    }
    return response.data;
  }

  async search(query: string, limit?: number): Promise<unknown> {
    const response = await this.request<unknown>("GET", "/search", {
      query: {
        q: query,
        limit
      }
    });
    return response.data ?? response;
  }

  async listCategories(): Promise<Category[]> {
    const response = await this.request<Category[]>("GET", "/categories");
    return response.data ?? [];
  }

  async createCategory(name: string): Promise<unknown> {
    const response = await this.request<unknown>("POST", "/categories", {
      body: {
        name,
        fieldPriorities: []
      }
    });
    return response.data ?? response;
  }

  async getSettings(): Promise<UserSettings> {
    const response = await this.request<UserSettings>("GET", "/settings");
    if (!response.data) {
      throw new Error("Settings not found");
    }
    return response.data;
  }

  async updateSettings(patch: Record<string, unknown>): Promise<unknown> {
    const response = await this.request<unknown>("PATCH", "/settings", {
      body: patch
    });
    return response.data ?? response;
  }
}
