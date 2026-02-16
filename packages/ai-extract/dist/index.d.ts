import type { ExtractionProvider } from "@scanvault/shared";
import type { AIExtractor, ExtractionResult } from "./types.js";
export * from "./types.js";
export * from "./prompt.js";
export * from "./json.js";
export declare function createExtractor(provider: ExtractionProvider): AIExtractor;
export declare function extractWithProvider(provider: ExtractionProvider, images: Buffer[], apiKey: string): Promise<ExtractionResult>;
