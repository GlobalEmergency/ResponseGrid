/**
 * Returns `value` only when it is a safe internal relative path; otherwise
 * `null`. Centralizes the post-login redirect sanitization so every entry point
 * (email/password login, signup, OAuth completion, social buttons) rejects
 * open-redirect targets the same way: absolute URLs (`https://evil.com`),
 * protocol-relative (`//evil.com`) and backslash tricks (`/\evil.com`, which
 * browsers fold into `//evil.com`).
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.includes('\\')) return null;
  return value;
}
