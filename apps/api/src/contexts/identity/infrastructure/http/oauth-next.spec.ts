import { sanitizeNextPath, OAUTH_NEXT_COOKIE } from './oauth-next';

describe('sanitizeNextPath', () => {
  it('accepts internal absolute paths (with query strings)', () => {
    expect(sanitizeNextPath('/grupos')).toBe('/grupos');
    expect(sanitizeNextPath('/e/slug/reportar?x=1&y=2')).toBe(
      '/e/slug/reportar?x=1&y=2',
    );
    expect(sanitizeNextPath('/')).toBe('/');
  });

  it('rejects absolute URLs', () => {
    expect(sanitizeNextPath('https://evil.com')).toBeUndefined();
    expect(sanitizeNextPath('http://evil.com/path')).toBeUndefined();
  });

  it('rejects protocol-relative and backslash tricks', () => {
    expect(sanitizeNextPath('//evil.com')).toBeUndefined();
    expect(sanitizeNextPath('/\\evil.com')).toBeUndefined();
    expect(sanitizeNextPath('/\\/evil.com')).toBeUndefined();
  });

  it('rejects non-rooted paths and non-strings', () => {
    expect(sanitizeNextPath('grupos')).toBeUndefined();
    expect(sanitizeNextPath('')).toBeUndefined();
    expect(sanitizeNextPath(undefined)).toBeUndefined();
    expect(sanitizeNextPath(null)).toBeUndefined();
    expect(sanitizeNextPath(42)).toBeUndefined();
  });

  it('exposes a stable cookie name', () => {
    expect(OAUTH_NEXT_COOKIE).toBe('rh_oauth_next');
  });
});
