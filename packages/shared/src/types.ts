export type ExtractionMode = "ai" | "ocr";
export type ExtractionProvider = "openai" | "anthropic" | "google";

export interface ExtractedField {
  key: string;
  value: string | number;
  unit?: string;
  confidence: number;
  source: "ai" | "ocr";
}

export interface Asset {
  id: string;
  userId: string;
  originalBlobUrl: string;
  normalizedBlobUrls: string[];
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  summary: string;
  categoryId: string;
  fields: ExtractedField[];
  entities: string[];
  extractionMode: ExtractionMode;
  extractionProvider?: ExtractionProvider;
  status: "uploading" | "processing" | "ready" | "failed";
  errorMessage?: string;
  rawOcrText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientExtractionResult {
  summary: string;
  fields: ExtractedField[];
  entities: string[];
  categoryName?: string;
  categorySlug?: string;
  rawText?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  fieldPriorities: string[];
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  extractionMode: ExtractionMode;
  aiProvider?: ExtractionProvider;
  aiKeyVaultRef?: string;
  blobContainerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionJob {
  assetId: string;
  userId: string;
  blobPath: string;
  normalizedBlobPaths: string[];
  extractionMode: ExtractionMode;
  aiProvider?: ExtractionProvider;
  aiKeyVaultRef?: string;
  attemptNumber: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: { continuationToken?: string; totalCount?: number };
}

export interface FieldFilter {
  key: string;
  operator: "=" | ">" | "<" | ">=" | "<=" | ":";
  value: string | number;
}

export interface ParsedQuery {
  keywords: string[];
  fieldFilters: FieldFilter[];
  categoryFilter?: string;
  entityFilter?: string;
}

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  slug: string;
  fieldPriorities: string[];
}> = [
  { name: "Finance", slug: "finance", fieldPriorities: ["total", "vendor", "date"] },
  { name: "Work", slug: "work", fieldPriorities: ["employer", "date", "amount"] },
  { name: "Health", slug: "health", fieldPriorities: ["provider", "date", "metric"] },
  { name: "Fitness", slug: "fitness", fieldPriorities: ["calories", "weight", "duration"] },
  { name: "Travel", slug: "travel", fieldPriorities: ["destination", "date", "cost"] },
  { name: "General", slug: "general", fieldPriorities: ["date"] }
];
