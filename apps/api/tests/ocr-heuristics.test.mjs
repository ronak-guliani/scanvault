import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFromOcrText } from '../dist/services/ocr.js';

test('extractFromOcrText extracts finance-oriented fields', () => {
  const text = `Invoice #ABCD1234\nDate: 2026-02-14\nTotal: $42.19\nEmail: buyer@example.com`;
  const result = extractFromOcrText(text);

  assert.equal(result.suggestedCategory, 'finance');
  assert.equal(result.fields.some((field) => field.key === 'invoice_number'), true);
  assert.equal(result.fields.some((field) => field.key === 'date'), true);
  assert.equal(result.fields.some((field) => field.key === 'total_amount'), true);
  assert.equal(result.fields.some((field) => field.key === 'email'), true);
  assert.equal(typeof result.summary, 'string');
});

test('extractFromOcrText infers travel category from keywords', () => {
  const text = 'Boarding pass for flight to Tokyo. Hotel confirmation attached.';
  const result = extractFromOcrText(text);
  assert.equal(result.suggestedCategory, 'travel');
});
