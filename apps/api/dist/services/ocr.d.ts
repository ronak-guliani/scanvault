import type { ExtractedField } from "@scanvault/shared";
export interface OCRExtractionResult {
    summary: string;
    fields: ExtractedField[];
    entities: string[];
    suggestedCategory: string;
    rawOcrText: string;
}
export declare function extractFromOcrText(rawText: string): OCRExtractionResult;
export declare function extractWithOCR(images: Buffer[]): Promise<OCRExtractionResult>;
