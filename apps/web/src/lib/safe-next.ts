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

/**
 * Single source of truth for the "send the user to login and bring them back"
 * contract. Given the internal route the user is on, returns the login URL that
 * restores it afterwards (`/login?next=<route>`). `next` is sanitised via
 * {@link safeNextPath}, so callers can pass a raw route without risking an open
 * redirect, and an absent/unsafe value collapses to a plain `/login`.
 *
 * Build every login redirect through this helper — never hand-write the
 * `?next=` query string — so the return path can't be forgotten (the #258 bug).
 * Pure and client-safe; server callers usually reach it re-exported from
 * `@/lib/auth` alongside {@link requireSession}.
 */
export function loginHref(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}
