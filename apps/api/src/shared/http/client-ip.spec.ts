import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('prefers the Cloudflare CF-Connecting-IP header over req.ip', () => {
    expect(
      clientIp({
        headers: { 'cf-connecting-ip': '203.0.113.7' },
        ip: '9.9.9.9',
      }),
    ).toBe('203.0.113.7');
  });

  it('uses the first value when the header is an array', () => {
    expect(clientIp({ headers: { 'cf-connecting-ip': ['203.0.113.7'] } })).toBe(
      '203.0.113.7',
    );
  });

  it('falls back to req.ip when the header is absent', () => {
    expect(clientIp({ headers: {}, ip: '9.9.9.9' })).toBe('9.9.9.9');
  });

  it('falls back to req.ip when there are no headers at all', () => {
    expect(clientIp({ ip: '9.9.9.9' })).toBe('9.9.9.9');
  });

  it('returns an empty string when neither header nor ip is present', () => {
    expect(clientIp({ headers: {} })).toBe('');
  });
});
