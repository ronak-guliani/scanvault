---
name: scanvault-copilot-extract-upload
description: Extract structured data from a local file, choose the best ScanVault category, and return strict JSON for CLI upload confirmation.
license: MIT
---

# ScanVault Copilot Extraction Skill

Use this skill when a user wants to upload a local image/PDF to ScanVault from CLI without configuring a provider API key.

## Goal

Given one file, produce **strict JSON only** that the CLI can pass to `/assets/upload/confirm` as `extracted` metadata.

## Input contract (JSON via stdin)

```json
{
  "filePath": "/absolute/or/relative/path/to/file",
  "fileName": "receipt-2026-02-16.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 123456,
  "categories": [
    { "name": "Finance", "slug": "finance" },
    { "name": "Travel", "slug": "travel" }
  ]
}
```

## Required behavior

1. Analyze the file contents (image/PDF) and extract useful structured information.
2. Select the best category from `categories` when possible.
3. If no existing category fits, propose a new category (name + slug).
4. Return concise, high-signal fields only (do not invent unsupported values).
5. Keep all output deterministic, machine-parseable, and safe.

## Output contract (JSON only; no markdown, no prose)

```json
{
  "summary": "Short factual summary",
  "fields": [
    {
      "key": "invoice_number",
      "value": "INV-1024",
      "unit": "",
      "confidence": 0.93,
      "source": "ai"
    }
  ],
  "entities": ["Acme Corp", "John Doe"],
  "categoryName": "Finance",
  "categorySlug": "finance",
  "assetName": "Acme Invoice INV-1024.pdf",
  "rawText": "optional OCR or extracted text"
}
```

## Output rules

- `summary`: 1-3 sentences, factual only.
- `fields[].key`: snake_case, domain-specific (`invoice_number`, `total_amount`, `date`, etc.).
- `fields[].value`: string or number only.
- `fields[].confidence`: `0.0` to `1.0`.
- `fields[].source`: `"ai"` (or `"ocr"` if explicitly OCR-derived).
- `entities`: unique proper nouns/organizations/products.
- `categorySlug`: lowercase kebab-case (`[a-z0-9-]`).
- `assetName`: concise user-facing filename for this asset (keep original extension when possible).
- If uncertain, still return best effort with lower confidence values.

## Safety & privacy constraints

- Never include secrets, auth tokens, local credentials, or system metadata.
- Never output executable code, shell commands, or markdown.
- Do not hallucinate sensitive PII not present in file.
- If the file is unreadable, return:

```json
{
  "summary": "Unable to read file content reliably.",
  "fields": [],
  "entities": [],
  "categoryName": "General",
  "categorySlug": "general"
}
```
