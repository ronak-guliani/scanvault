import { z } from "zod";

export const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024)
});

const extractedFieldSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.union([z.string().max(2000), z.number()]),
  unit: z.string().max(50).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["ai", "ocr"]).optional()
});

export const clientExtractionSchema = z.object({
  summary: z.string().min(1).max(5000),
  fields: z.array(extractedFieldSchema).max(100),
  entities: z.array(z.string().min(1).max(120)).max(50),
  categoryName: z.string().min(1).max(100).optional(),
  categorySlug: z.string().min(1).max(50).optional(),
  rawText: z.string().max(20000).optional()
});

export const uploadConfirmSchema = z.object({
  assetId: z.string().min(1),
  extracted: clientExtractionSchema.optional()
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  fieldPriorities: z.array(z.string().min(1)).default([])
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldPriorities: z.array(z.string().min(1)).optional()
});

export const updateAssetCategorySchema = z.object({
  categoryId: z.string().min(1)
});

export const updateSettingsSchema = z.object({
  extractionMode: z.enum(["ai", "ocr"]).optional(),
  aiProvider: z.enum(["openai", "anthropic", "google"]).optional(),
  apiKey: z.string().min(1).optional()
});
