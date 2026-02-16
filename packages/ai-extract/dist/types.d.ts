import type { ExtractedField, ExtractionProvider } from "@scanvault/shared";
export type AIProvider = ExtractionProvider;
export interface ExtractionResult {
    summary: string;
    fields: ExtractedField[];
    suggestedCategory: string;
    entities: string[];
}
export interface AIExtractor {
    extract(images: Buffer[], apiKey: string): Promise<ExtractionResult>;
}
