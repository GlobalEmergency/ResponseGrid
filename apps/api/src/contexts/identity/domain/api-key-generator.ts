import { randomBytes } from 'node:crypto';

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
