import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedResourcePath,
  proxyPublicResources,
  type FetchLike,
} from './proxy-core.ts';

const EMERGENCY = '11111111-1111-4111-8111-111111111111';
const LIST_SEGMENTS = ['emergencies', EMERGENCY, 'public', 'resources'];

// ── Allowlist: the session token must only ever reach the public resources
// read family, never any other API endpoint (the core security boundary). ──────

test('allowlist permits the public resources read family', () => {
  assert.equal(isAllowedResourcePath(LIST_SEGMENTS), true);
  assert.equal(
    isAllowedResourcePath([...LIST_SEGMENTS, 'nearby']),
    true,
  );
  assert.equal(
    isAllowedResourcePath([...LIST_SEGMENTS, 'in-bounds']),
    true,
  );
  assert.equal(
    isAllowedResourcePath([...LIST_SEGMENTS, 'facets']),
    true,
  );
  // detail (resourceId is a UUID)
  assert.equal(
    isAllowedResourcePath([...LIST_SEGMENTS, EMERGENCY]),
    true,
  );
});

test('allowlist rejects any non-resources endpoint and path traversal', () => {
  assert.equal(isAllowedResourcePath(['auth', 'me']), false);
  assert.equal(
    isAllowedResourcePath(['emergencies', EMERGENCY, 'manage', 'resources']),
    false,
  );
  assert.equal(
    isAllowedResourcePath(['emergencies', EMERGENCY, 'public', 'needs']),
    false,
  );
  assert.equal(
    isAllowedResourcePath(['emergencies', 'not-a-uuid', 'public', 'resources']),
    false,
  );
  assert.equal(
    isAllowedResourcePath([...LIST_SEGMENTS, '..', 'secret']),
    false,
  );
  assert.equal(isAllowedResourcePath([...LIST_SEGMENTS, 'bogus-sub']), false);
});

// ── Fake API mirroring the #267 server-side redaction: it reveals `contact`
// only when a Bearer token arrives, and redacts it (null) otherwise. ───────────

const fakeApi: FetchLike = (_url, init) => {
  const authed = typeof init.headers.Authorization === 'string';
  const body = JSON.stringify({
    items: [{ id: 'r1', hasContact: true, contact: authed ? '+58 555 0000' : null }],
    total: 1,
  });
  return Promise.resolve(
    new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
};

test('anonymous (no token) → contact stays redacted through the proxy', async () => {
  const res = await proxyPublicResources({
    base: 'http://api',
    segments: LIST_SEGMENTS,
    search: '?page=1&limit=50',
    token: null,
    fetchFn: fakeApi,
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    items: { contact: string | null; hasContact: boolean }[];
  };
  assert.equal(data.items[0].contact, null);
  // hasContact still true so the card can say "log in to see it".
  assert.equal(data.items[0].hasContact, true);
  // Per-user response must never be shared-cached.
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
});

test('authenticated (token) → proxy forwards Bearer and contact is revealed', async () => {
  const res = await proxyPublicResources({
    base: 'http://api',
    segments: LIST_SEGMENTS,
    search: '?page=1&limit=50',
    token: 'valid-jwt',
    fetchFn: fakeApi,
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { items: { contact: string | null }[] };
  assert.equal(data.items[0].contact, '+58 555 0000');
});

test('forwards the exact upstream URL and Bearer header for allowed reads', async () => {
  let seenUrl = '';
  let seenAuth: string | undefined;
  const spy: FetchLike = (url, init) => {
    seenUrl = url;
    seenAuth = init.headers.Authorization;
    return Promise.resolve(
      new Response('{"items":[],"total":0}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  await proxyPublicResources({
    base: 'http://api:3000',
    segments: LIST_SEGMENTS,
    search: '?page=2&limit=50',
    token: 'tok',
    fetchFn: spy,
  });
  assert.equal(
    seenUrl,
    `http://api:3000/emergencies/${EMERGENCY}/public/resources?page=2&limit=50`,
  );
  assert.equal(seenAuth, 'Bearer tok');
});

test('never forwards the session token to a non-allowlisted endpoint', async () => {
  let called = false;
  const spy: FetchLike = () => {
    called = true;
    return Promise.resolve(new Response('{}'));
  };
  const res = await proxyPublicResources({
    base: 'http://api',
    segments: ['auth', 'me'],
    search: '',
    token: 'valid-jwt',
    fetchFn: spy,
  });
  assert.equal(res.status, 404);
  assert.equal(called, false);
});
