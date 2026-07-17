import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AID_BOTS, GITHUB_REPO_URL, botContactPoints } from './bots.ts';

/**
 * The chat-assistant links are promoted site-wide and surfaced to search
 * engines / AI assistants, so their shape must stay stable and valid.
 */
test('Telegram deep link is a t.me URL matching its handle', () => {
  assert.match(AID_BOTS.telegram.url, /^https:\/\/t\.me\//);
  assert.equal(AID_BOTS.telegram.handle, '@donacionesvenezuela_bot');
  assert.ok(AID_BOTS.telegram.url.endsWith('donacionesvenezuela_bot'));
});

test('WhatsApp deep link is a wa.me URL with a digits-only number', () => {
  assert.match(AID_BOTS.whatsapp.url, /^https:\/\/wa\.me\/\d+$/);
  // wa.me requires E.164 without the leading `+`.
  assert.doesNotMatch(AID_BOTS.whatsapp.url, /\+/);
});

test('GitHub repo URL points at the public repository', () => {
  assert.equal(GITHUB_REPO_URL, 'https://github.com/GlobalEmergency/ResponseGrid');
});

test('bot ContactPoints carry the messaging deep links for GEO', () => {
  const urls = botContactPoints.map((c) => c.url);
  assert.ok(urls.includes(AID_BOTS.telegram.url));
  assert.ok(urls.includes(AID_BOTS.whatsapp.url));
  for (const cp of botContactPoints) {
    assert.equal(cp['@type'], 'ContactPoint');
  }
});
