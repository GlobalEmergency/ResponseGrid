import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath, loginHref, sessionClearHref } from './safe-next.ts';

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

/**
 * loginHref is the single source of truth for the `?next=` contract: every
 * login redirect goes through it, so a safe origin round-trips and an unsafe or
 * absent one collapses to a plain `/login` (never an open redirect).
 */
test('loginHref embeds a safe origin as an encoded next param', () => {
  assert.equal(
    loginHref('/e/terremoto-venezuela-2026/registrar'),
    '/login?next=%2Fe%2Fterremoto-venezuela-2026%2Fregistrar',
  );
});

test('loginHref falls back to plain /login for unsafe or missing next', () => {
  assert.equal(loginHref('https://evil.com'), '/login'); // open-redirect dropped
  assert.equal(loginHref('//evil.com'), '/login');
  assert.equal(loginHref(undefined), '/login');
  assert.equal(loginHref(null), '/login');
});

/**
 * sessionClearHref routes an expired-session redirect through the route handler
 * that CAN delete the cookie (render paths cannot). Same `next` contract as
 * loginHref: safe origins round-trip, unsafe/absent ones are dropped.
 */
test('sessionClearHref embeds a safe origin as an encoded next param', () => {
  assert.equal(
    sessionClearHref('/e/terremoto-venezuela-2026/mis-puntos'),
    '/api/session/clear?next=%2Fe%2Fterremoto-venezuela-2026%2Fmis-puntos',
  );
});

test('sessionClearHref drops unsafe or missing next', () => {
  assert.equal(sessionClearHref('https://evil.com'), '/api/session/clear');
  assert.equal(sessionClearHref('//evil.com'), '/api/session/clear');
  assert.equal(sessionClearHref('/\\evil.com'), '/api/session/clear');
  assert.equal(sessionClearHref(undefined), '/api/session/clear');
  assert.equal(sessionClearHref(null), '/api/session/clear');
});
