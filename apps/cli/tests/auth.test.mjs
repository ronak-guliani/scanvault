import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtPayload } from '../dist/src/lib/auth.js';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

test('decodeJwtPayload decodes jwt payload fields', () => {
  const token = createToken({ sub: 'u1', email: 'u@example.com' });
  const payload = decodeJwtPayload(token);
  assert.equal(payload.sub, 'u1');
  assert.equal(payload.email, 'u@example.com');
});

test('decodeJwtPayload rejects malformed token', () => {
  assert.throws(() => decodeJwtPayload('invalid-token'), /Invalid JWT format/);
});
