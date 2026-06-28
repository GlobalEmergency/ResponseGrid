import { generateApiKey, prefixOf } from './api-key-generator';

describe('api-key-generator', () => {
  it('generates a rh_live_ key whose prefix is derivable from the plaintext', () => {
    const { plaintext, prefix } = generateApiKey();
    expect(plaintext.startsWith('rh_live_')).toBe(true);
    expect(prefix).toBe(prefixOf(plaintext));
    expect(prefix.length).toBe('rh_live_'.length + 8);
  });

  it('produces distinct keys', () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });

  it('prefixOf rejects malformed keys', () => {
    expect(prefixOf('not-a-key')).toBeNull();
    expect(prefixOf('rh_live_')).toBeNull();
    expect(prefixOf('rh_test_abcdef12')).toBeNull();
  });
});
