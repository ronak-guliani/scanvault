import type { AIExtractor, ExtractionResult } from "../types.js";
export declare class OpenAIExtractor implements AIExtractor {
    extract(images: Buffer[], apiKey: string): Promise<ExtractionResult>;
}
