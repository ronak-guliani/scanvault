import type { Asset, Category, UserSettings } from "@scanvault/shared";
import { apiBaseUrl } from "./config";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: { continuationToken?: string };
}

interface UploadInitResponse {
  assetId: string;
  sasUploadUrl: string;
}

interface SearchResponse {
  query: unknown;
  items: Asset[];
}

function inferMimeType(file: File): string {
  if (file.type && ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
    return file.type;
  }

  const normalized = file.name.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  throw new Error("Unsupported file type. Use png, jpg, webp, or pdf.");
}

export class WebApiClient {
  private createUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
    const resolvedBase =
      base.startsWith("http://") || base.startsWith("https://")
        ? base
        : `${window.location.origin}${base.startsWith("/") ? "" : "/"}${base}`;
    const url = new URL(path.replace(/^\//, ""), resolvedBase);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async requestEnvelope<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, string | number | undefined> } = {}
  ): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = { Accept: "application/json" };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    // Cookies are sent automatically; the proxy injects the Bearer token
    const response = await fetch(this.createUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: "same-origin",
    });

    const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

    if (!response.ok || json.success === false) {
      const message = json.error?.message ?? `${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return json;
  }

  private async requestData<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, string | number | undefined> } = {}
  ): Promise<T> {
    const response = await this.requestEnvelope<T>(method, path, options);
    if (response.data === undefined) throw new Error("API returned no data");
    return response.data;
  }

  async uploadFile(file: File): Promise<{ assetId: string; status: string }> {
    const mimeType = inferMimeType(file);
    const init = await this.requestData<UploadInitResponse>("POST", "/assets/upload", {
      body: { fileName: file.name, mimeType, fileSize: file.size }
    });

    const uploadResponse = await fetch(init.sasUploadUrl, {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": mimeType },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`Blob upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return this.requestData<{ assetId: string; status: string }>("POST", "/assets/upload/confirm", {
      body: { assetId: init.assetId }
    });
  }

  async listAssets(params: {
    category?: string;
    status?: string;
    limit?: number;
    continuationToken?: string;
  }): Promise<{ items: Asset[]; continuationToken?: string }> {
    const response = await this.requestEnvelope<Asset[]>("GET", "/assets", { query: params });
    return { items: response.data ?? [], continuationToken: response.pagination?.continuationToken };
  }

  async getAsset(id: string): Promise<Asset> {
    return this.requestData<Asset>("GET", `/assets/${id}`);
  }

  async deleteAsset(id: string): Promise<void> {
    await this.requestEnvelope("DELETE", `/assets/${id}`);
  }

  async listCategories(): Promise<Category[]> {
    return this.requestData<Category[]>("GET", "/categories");
  }

  async createCategory(name: string): Promise<Category> {
    return this.requestData<Category>("POST", "/categories", { body: { name, fieldPriorities: [] } });
  }

  async updateCategory(id: string, payload: { name?: string; fieldPriorities?: string[] }): Promise<Category> {
    return this.requestData<Category>("PATCH", `/categories/${id}`, { body: payload });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.requestEnvelope("DELETE", `/categories/${id}`);
  }

  async search(query: string, limit = 20): Promise<SearchResponse> {
    return this.requestData<SearchResponse>("GET", "/search", { query: { q: query, limit } });
  }

  async getSettings(): Promise<UserSettings> {
    return this.requestData<UserSettings>("GET", "/settings");
  }

  async updateSettings(payload: { extractionMode?: "ai" | "ocr"; aiProvider?: "openai" | "anthropic" | "google"; apiKey?: string }): Promise<UserSettings> {
    return this.requestData<UserSettings>("PATCH", "/settings", { body: payload });
  }
}
