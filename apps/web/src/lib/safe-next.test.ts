import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from './safe-next.ts';

/**
 * #258: post-login redirect must return the user to the internal page they came
 * from, never to an attacker-controlled external target (open-redirect).
 */
test('keeps a safe internal path (the origin form)', () => {
  assert.equal(
    safeNextPath('/e/terremoto-venezuela-2026/registrar'),
    '/e/terremoto-venezuela-2026/registrar',
  );
});

test('rejects open-redirect targets', () => {
  assert.equal(safeNextPath('https://evil.com'), null); // absolute URL
  assert.equal(safeNextPath('//evil.com'), null); // protocol-relative
  assert.equal(safeNextPath('/\\evil.com'), null); // backslash → //evil.com
  assert.equal(safeNextPath('relative'), null); // not rooted
  assert.equal(safeNextPath(undefined), null); // absent
});
