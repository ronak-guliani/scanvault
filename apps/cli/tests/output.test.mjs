import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printOutput, shouldUseJson } from '../dist/src/lib/output.js';

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
