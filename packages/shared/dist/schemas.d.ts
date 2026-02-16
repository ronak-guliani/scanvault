import { z } from "zod";
export declare const uploadRequestSchema: z.ZodObject<{
    fileName: z.ZodString;
    mimeType: z.ZodEnum<["image/png", "image/jpeg", "image/webp", "application/pdf"]>;
    fileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
    fileSize: number;
}, {
    fileName: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
    fileSize: number;
}>;
export declare const clientExtractionSchema: z.ZodObject<{
    summary: z.ZodString;
    fields: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        unit: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodEnum<["ai", "ocr"]>>;
    }, "strip", z.ZodTypeAny, {
        value: string | number;
        key: string;
        unit?: string | undefined;
        confidence?: number | undefined;
        source?: "ai" | "ocr" | undefined;
    }, {
        value: string | number;
        key: string;
        unit?: string | undefined;
        confidence?: number | undefined;
        source?: "ai" | "ocr" | undefined;
    }>, "many">;
    entities: z.ZodArray<z.ZodString, "many">;
    categoryName: z.ZodOptional<z.ZodString>;
    categorySlug: z.ZodOptional<z.ZodString>;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    fields: {
        value: string | number;
        key: string;
        unit?: string | undefined;
        confidence?: number | undefined;
        source?: "ai" | "ocr" | undefined;
    }[];
    entities: string[];
    categoryName?: string | undefined;
    categorySlug?: string | undefined;
    rawText?: string | undefined;
}, {
    summary: string;
    fields: {
        value: string | number;
        key: string;
        unit?: string | undefined;
        confidence?: number | undefined;
        source?: "ai" | "ocr" | undefined;
    }[];
    entities: string[];
    categoryName?: string | undefined;
    categorySlug?: string | undefined;
    rawText?: string | undefined;
}>;
export declare const uploadConfirmSchema: z.ZodObject<{
    assetId: z.ZodString;
    extracted: z.ZodOptional<z.ZodObject<{
        summary: z.ZodString;
        fields: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
            unit: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
            source: z.ZodOptional<z.ZodEnum<["ai", "ocr"]>>;
        }, "strip", z.ZodTypeAny, {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }, {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }>, "many">;
        entities: z.ZodArray<z.ZodString, "many">;
        categoryName: z.ZodOptional<z.ZodString>;
        categorySlug: z.ZodOptional<z.ZodString>;
        rawText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        fields: {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }[];
        entities: string[];
        categoryName?: string | undefined;
        categorySlug?: string | undefined;
        rawText?: string | undefined;
    }, {
        summary: string;
        fields: {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }[];
        entities: string[];
        categoryName?: string | undefined;
        categorySlug?: string | undefined;
        rawText?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    extracted?: {
        summary: string;
        fields: {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }[];
        entities: string[];
        categoryName?: string | undefined;
        categorySlug?: string | undefined;
        rawText?: string | undefined;
    } | undefined;
}, {
    assetId: string;
    extracted?: {
        summary: string;
        fields: {
            value: string | number;
            key: string;
            unit?: string | undefined;
            confidence?: number | undefined;
            source?: "ai" | "ocr" | undefined;
        }[];
        entities: string[];
        categoryName?: string | undefined;
        categorySlug?: string | undefined;
        rawText?: string | undefined;
    } | undefined;
}>;
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    fieldPriorities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    fieldPriorities: string[];
}, {
    name: string;
    fieldPriorities?: string[] | undefined;
}>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    fieldPriorities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    fieldPriorities?: string[] | undefined;
}, {
    name?: string | undefined;
    fieldPriorities?: string[] | undefined;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    extractionMode: z.ZodOptional<z.ZodEnum<["ai", "ocr"]>>;
    aiProvider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "google"]>>;
    apiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    extractionMode?: "ai" | "ocr" | undefined;
    aiProvider?: "openai" | "anthropic" | "google" | undefined;
    apiKey?: string | undefined;
}, {
    extractionMode?: "ai" | "ocr" | undefined;
    aiProvider?: "openai" | "anthropic" | "google" | undefined;
    apiKey?: string | undefined;
}>;
