import { randomBytes, createHash } from 'node:crypto';

export interface GeneratedSetupToken {
  /** The opaque secret handed to the user (in the email link), shown once. */
  plaintext: string;
  /** SHA-256 of the plaintext — this is what gets persisted, never the secret. */
  hash: string;
}

/**
 * Generate a password-setup token: 256 bits of cryptographic randomness,
 * base64url-encoded so it travels cleanly in a URL query string. Only the SHA-256
 * hash is ever stored, so a database read never yields a usable token. SHA-256
 * (not bcrypt) is appropriate here — the secret is high-entropy, unlike a
 * password, and lookups are a plain hash equality on an indexed column, so there
 * is no per-character timing side-channel to defend against.
 */
export function generateSetupToken(): GeneratedSetupToken {
  const plaintext = randomBytes(32).toString('base64url');
  return { plaintext, hash: hashSetupToken(plaintext) };
}

/** Derive the storage/lookup hash from a presented token. */
export function hashSetupToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}
