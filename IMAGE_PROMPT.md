# ScanVault CLI Image Extraction Prompt

Use this prompt when the CLI uploads an image/PDF in Copilot extraction mode before calling ScanVault upload confirm.

## Prompt

Extract structured data from this document image.

Return strictly JSON with keys:
- `summary`
- `fields`
- `entities`
- `categorySlug`
- `categoryName`
- `assetName`
- `rawText`

Rules:
1. Output JSON only (no markdown, no prose).
2. `summary` must be short and factual.
3. `fields` must contain objects with: `key`, `value`, optional `unit`, optional `confidence` (0-1), optional `source` (`ai` or `ocr`).
4. Choose `categorySlug/categoryName` from existing categories when possible; otherwise propose a sensible new category.
5. Provide `assetName` as a clean user-facing filename (preserve extension).
6. For receipts/invoices, include line-item details and totals:
   - line item name, quantity, unit price, amount
   - subtotal, tax, total
   - receipt/invoice number, date, store/vendor name, phone (if visible)
7. Do not hallucinate; omit unknown fields instead of inventing values.
8. Include `rawText` only when useful OCR text is available.

## Expected JSON shape

```json
{
  "summary": "Receipt from East Repair Inc. for parts and labor.",
  "fields": [
    { "key": "store_name", "value": "East Repair Inc.", "confidence": 0.96, "source": "ai" },
    { "key": "receipt_number", "value": "US-001", "confidence": 0.95, "source": "ai" },
    { "key": "line_item_1_name", "value": "Front and rear brake cables", "confidence": 0.94, "source": "ai" },
    { "key": "line_item_1_qty", "value": 1, "confidence": 0.94, "source": "ai" },
    { "key": "line_item_1_unit_price", "value": 100.0, "confidence": 0.94, "source": "ai" },
    { "key": "line_item_1_price", "value": 100.0, "confidence": 0.94, "source": "ai" },
    { "key": "subtotal_amount", "value": 145.0, "confidence": 0.94, "source": "ai" },
    { "key": "tax_amount", "value": 9.06, "confidence": 0.94, "source": "ai" },
    { "key": "total_amount", "value": 154.06, "confidence": 0.94, "source": "ai" }
  ],
  "entities": ["East Repair Inc.", "John Smith"],
  "categoryName": "Finance",
  "categorySlug": "finance",
  "assetName": "East Repair Receipt US-001.jpg",
  "rawText": "optional OCR text"
}
```
