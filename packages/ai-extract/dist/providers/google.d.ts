import type { AIExtractor, ExtractionResult } from "../types.js";
export declare class GoogleExtractor implements AIExtractor {
    extract(images: Buffer[], apiKey: string): Promise<ExtractionResult>;
}
