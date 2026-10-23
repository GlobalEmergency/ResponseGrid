import {
  generateSetupToken,
  hashSetupToken,
} from './password-setup-token-generator';

describe('password-setup-token-generator', () => {
  it('generates a high-entropy, url-safe plaintext', () => {
    const { plaintext } = generateSetupToken();
    // 32 random bytes → 43 base64url chars, only [A-Za-z0-9_-].
    expect(plaintext).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats a token', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateSetupToken().plaintext);
    expect(seen.size).toBe(100);
  });

  it('stores a hash, not the plaintext, and the hash is deterministic', () => {
    const { plaintext, hash } = generateSetupToken();
    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSetupToken(plaintext)).toBe(hash);
  });
});
