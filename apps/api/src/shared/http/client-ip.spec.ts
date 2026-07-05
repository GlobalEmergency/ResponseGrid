import { clientIp, isCloudflareIp } from './client-ip';

const CF_PEER = '173.245.48.10'; // inside 173.245.48.0/20
const DIRECT_PEER = '203.0.113.50'; // not a Cloudflare range

describe('isCloudflareIp', () => {
  it('recognises a Cloudflare IPv4 edge address', () => {
    expect(isCloudflareIp('104.16.0.1')).toBe(true);
  });

  it('recognises a Cloudflare IPv6 edge address', () => {
    expect(isCloudflareIp('2606:4700::1')).toBe(true);
  });

  it('recognises a v4-mapped IPv6 Cloudflare address', () => {
    expect(isCloudflareIp('::ffff:104.16.0.1')).toBe(true);
  });

  it('rejects a non-Cloudflare address', () => {
    expect(isCloudflareIp('203.0.113.50')).toBe(false);
  });

  it('rejects garbage / empty input', () => {
    expect(isCloudflareIp('not-an-ip')).toBe(false);
    expect(isCloudflareIp(undefined)).toBe(false);
  });
});

describe('clientIp', () => {
  it('trusts CF-Connecting-IP when the peer is a Cloudflare edge', () => {
    expect(
      clientIp({
        headers: { 'cf-connecting-ip': '203.0.113.7' },
        ip: CF_PEER,
      }),
    ).toBe('203.0.113.7');
  });

  it('IGNORES a forged CF-Connecting-IP when the peer is NOT Cloudflare (direct hit)', () => {
    // A client hitting the origin directly can set any header — we must key off
    // the unforgeable TCP peer, not the spoofed header.
    expect(
      clientIp({
        headers: { 'cf-connecting-ip': '203.0.113.7' },
        ip: DIRECT_PEER,
      }),
    ).toBe(DIRECT_PEER);
  });

  it('falls back to the peer IP when via Cloudflare but the header is absent', () => {
    expect(clientIp({ headers: {}, ip: CF_PEER })).toBe(CF_PEER);
  });

  it('uses the first value when the header is an array', () => {
    expect(
      clientIp({
        headers: { 'cf-connecting-ip': ['203.0.113.7'] },
        ip: CF_PEER,
      }),
    ).toBe('203.0.113.7');
  });

  it('returns the peer IP for a plain direct request with no headers', () => {
    expect(clientIp({ ip: DIRECT_PEER })).toBe(DIRECT_PEER);
  });

  it('returns an empty string when there is no peer IP at all', () => {
    expect(clientIp({ headers: {} })).toBe('');
  });
});
