import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export interface GeneratedApiKey {
  /** The full secret key, shown to the caller exactly once. */
  plaintext: string;
  /** Stable, non-secret identifier stored for lookup (e.g. `rh_live_ab12cd34`). */
  prefix: string;
}

const KEY_RE = /^rh_live_([0-9a-f]{16,})$/;

/** Generate a fresh API key: `rh_live_<48 hex>`, with an 8-char lookup prefix. */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString('hex'); // 48 hex chars
  return {
    plaintext: `rh_live_${secret}`,
    prefix: `rh_live_${secret.slice(0, 8)}`,
  };
}

/** Derive the lookup prefix from a presented key, or null if malformed. */
export function prefixOf(plaintext: string): string | null {
  const match = KEY_RE.exec(plaintext);
  if (!match) return null;
  return `rh_live_${match[1].slice(0, 8)}`;
}

/**
 * Hash an API key secret for storage. SHA-256 is appropriate here (the secret
 * is high-entropy, unlike a password) and is fast enough to verify on every
 * request — bcrypt would be needlessly slow for an API plane.
 */
export function hashApiKeySecret(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/** Constant-time verification of a presented key against a stored hash. */
export function verifyApiKeySecret(plaintext: string, hash: string): boolean {
  const presented = Buffer.from(hashApiKeySecret(plaintext), 'hex');
  let stored: Buffer;
  try {
    stored = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  return (
    presented.length === stored.length && timingSafeEqual(presented, stored)
  );
}
