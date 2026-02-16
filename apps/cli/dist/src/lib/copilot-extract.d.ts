import type { Category, ClientExtractionResult } from "@scanvault/shared";
export declare function extractWithCopilot(filePath: string, mimeType: string, categories: Category[], commandLine?: string): Promise<ClientExtractionResult>;
