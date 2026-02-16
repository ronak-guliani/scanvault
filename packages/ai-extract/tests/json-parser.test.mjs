import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExtractor, parseExtractionResponse } from '../dist/index.js';

test('parseExtractionResponse normalizes AI payload', () => {
  const raw = JSON.stringify({
    summary: 'Receipt summary.',
    fields: [{ key: 'total_amount', value: 42.19, unit: 'USD', confidence: 0.93 }],
    suggested_category: 'finance',
    entities: ['Amazon']
  });

  const parsed = parseExtractionResponse(raw);
  assert.equal(parsed.summary, 'Receipt summary.');
  assert.equal(parsed.suggestedCategory, 'finance');
  assert.equal(parsed.fields[0].source, 'ai');
  assert.equal(parsed.fields[0].confidence, 0.93);
  assert.deepEqual(parsed.entities, ['Amazon']);
});

test('createExtractor supports all configured providers', () => {
  assert.equal(createExtractor('openai').constructor.name, 'OpenAIExtractor');
  assert.equal(createExtractor('anthropic').constructor.name, 'AnthropicExtractor');
  assert.equal(createExtractor('google').constructor.name, 'GoogleExtractor');
});
