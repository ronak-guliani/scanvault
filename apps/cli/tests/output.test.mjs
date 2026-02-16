import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printOutput, shouldUseJson } from '../dist/src/lib/output.js';

function withTty(value, run) {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });

  try {
    run();
  } finally {
    if (descriptor) {
      Object.defineProperty(process.stdout, 'isTTY', descriptor);
    }
  }
}

test('shouldUseJson honors explicit json flag', () => {
  assert.equal(shouldUseJson(true), true);
});

test('printOutput quiet mode prints id values', () => {
  const writes = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, cb) => {
    writes.push(String(chunk));
    if (typeof encoding === 'function') encoding();
    if (typeof cb === 'function') cb();
    return true;
  };

  try {
    printOutput([{ id: 'a1' }, { id: 'a2' }], { quiet: true });
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.equal(writes.join(''), 'a1\na2\n');
});

test('printOutput json mode emits JSON string', () => {
  const writes = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, cb) => {
    writes.push(String(chunk));
    if (typeof encoding === 'function') encoding();
    if (typeof cb === 'function') cb();
    return true;
  };

  try {
    printOutput({ ok: true }, { json: true });
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.match(writes.join(''), /"ok": true/);
});

test('printOutput compacts asset arrays for terminal table output', () => {
  const rows = [];
  const originalTable = console.table;
  console.table = (value) => rows.push(value);

  const input = [
    {
      id: '38e0041d-6cdd-4ab6-b775-b8c18fa1458a',
      userId: 'ronak@example.com',
      originalBlobUrl: 'user-ronak/38e0041d/east_repair_receipt.jpg',
      normalizedBlobUrls: ['user-ronak/38e0041d/east_repair_receipt.jpg'],
      originalFileName: 'east_repair_receipt.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 176122,
      summary: 'Receipt from East Repair Inc. for services and parts with multiple line items.',
      categoryId: 'finance',
      fields: [{ key: 'total', value: 154.06 }],
      entities: ['East Repair Inc.'],
      extractionMode: 'ai',
      status: 'ready',
      createdAt: '2026-02-16T05:46:24.988Z',
      updatedAt: '2026-02-16T05:46:25.340Z',
      rawOcrText: 'very long text'.repeat(200)
    }
  ];

  try {
    withTty(true, () => printOutput(input));
  } finally {
    console.table = originalTable;
  }

  assert.equal(rows.length, 1);
  assert.equal(Array.isArray(rows[0]), true);
  assert.deepEqual(Object.keys(rows[0][0]), ['id', 'file', 'category', 'status', 'size', 'createdAt', 'summary']);
  assert.equal(rows[0][0].id, '38e0041d-6cdd-4ab6-b775-b8c18fa1458a');
});

test('printOutput empty arrays show no results in terminal mode', () => {
  const writes = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, cb) => {
    writes.push(String(chunk));
    if (typeof encoding === 'function') encoding();
    if (typeof cb === 'function') cb();
    return true;
  };

  try {
    withTty(true, () => printOutput([]));
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.equal(writes.join(''), 'No results.\n');
});
