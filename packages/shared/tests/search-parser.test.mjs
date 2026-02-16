import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchQuery } from '../dist/utils/search-parser.js';

test('parseSearchQuery handles combined filters and keywords', () => {
  const parsed = parseSearchQuery('category:finance vendor:amazon total>50 protein date:2026-02-*');
  assert.equal(parsed.categoryFilter, 'finance');
  assert.equal(parsed.entityFilter, 'amazon');
  assert.equal(parsed.keywords.includes('protein'), true);
  assert.deepEqual(parsed.fieldFilters.find((f) => f.key === 'total'), {
    key: 'total',
    operator: '>',
    value: 50
  });
  assert.deepEqual(parsed.fieldFilters.find((f) => f.key === 'date'), {
    key: 'date',
    operator: ':',
    value: '2026-02-'
  });
});

test('parseSearchQuery keeps plain words as keywords', () => {
  const parsed = parseSearchQuery('amazon invoice');
  assert.deepEqual(parsed.keywords, ['amazon', 'invoice']);
  assert.equal(parsed.fieldFilters.length, 0);
});
