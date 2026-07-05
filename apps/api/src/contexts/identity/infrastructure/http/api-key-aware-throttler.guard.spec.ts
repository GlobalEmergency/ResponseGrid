import { apiKeyThrottleTracker } from './api-key-aware-throttler.guard';

const KEY = `rh_live_${'a'.repeat(48)}`; // valid: rh_live_ + 48 hex

describe('apiKeyThrottleTracker', () => {
  it('keys API-key traffic by the key prefix, not the IP', () => {
    expect(
      apiKeyThrottleTracker({ headers: { 'x-api-key': KEY }, ip: '1.2.3.4' }),
    ).toBe('rh_live_aaaaaaaa');
  });

  it('uses the first value when the header is an array', () => {
    expect(
      apiKeyThrottleTracker({ headers: { 'x-api-key': [KEY] }, ip: '1.2.3.4' }),
    ).toBe('rh_live_aaaaaaaa');
  });

  it('falls back to the IP when there is no API key', () => {
    expect(apiKeyThrottleTracker({ headers: {}, ip: '9.9.9.9' })).toBe(
      '9.9.9.9',
    );
  });

  it('uses CF-Connecting-IP (real client) over req.ip when no API key', () => {
    expect(
      apiKeyThrottleTracker({
        headers: { 'cf-connecting-ip': '203.0.113.9' },
        ip: '9.9.9.9',
      }),
    ).toBe('203.0.113.9');
  });

  it('falls back to the IP when the API key is malformed', () => {
    expect(
      apiKeyThrottleTracker({
        headers: { 'x-api-key': 'not-a-key' },
        ip: '9.9.9.9',
      }),
    ).toBe('9.9.9.9');
  });

  it('returns an empty string when neither a key nor an IP is present', () => {
    expect(apiKeyThrottleTracker({ headers: {} })).toBe('');
  });
});
