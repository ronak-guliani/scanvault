import type { ExtractedField } from "@scanvault/shared";
import type { ExtractionResult } from "./types.js";

function extractJsonBlock(input: string): string {
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("AI response did not contain valid JSON object");
  }
  return input.slice(first, last + 1);
}

function normalizeField(field: Record<string, unknown>): ExtractedField {
  const confidenceRaw = typeof field.confidence === "number" ? field.confidence : 0.5;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));

  return {
    key: String(field.key ?? "unknown_field"),
    value: typeof field.value === "number" ? field.value : String(field.value ?? ""),
    unit: field.unit == null ? undefined : String(field.unit),
    confidence,
    source: "ai"
  };
}

export function parseExtractionResponse(rawText: string): ExtractionResult {
  const parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;
  const fields = Array.isArray(parsed.fields)
    ? parsed.fields.map((field) => normalizeField((field ?? {}) as Record<string, unknown>))
    : [];

  const entities = Array.isArray(parsed.entities)
    ? parsed.entities.map((entity) => String(entity)).filter((entity) => entity.length > 0)
    : [];

  return {
    summary: String(parsed.summary ?? ""),
    fields,
    suggestedCategory: String(parsed.suggested_category ?? "general"),
    entities
  };
}
