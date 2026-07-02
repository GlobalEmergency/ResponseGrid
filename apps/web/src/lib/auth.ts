import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginHref } from './safe-next';
import { SESSION_COOKIE } from './session-cookie';

// Re-exported so server callers can pull the login-redirect contract and the
// session gate from one place (`@/lib/auth`); defined in `safe-next` because it
// is pure and must stay importable from client components too.
export { loginHref };

const COOKIE_NAME = SESSION_COOKIE;

/**
 * Session lifetime in seconds. Defaults to 8 hours; override with SESSION_MAX_AGE_SECONDS
 * env var (e.g. SESSION_MAX_AGE_SECONDS=3600 for 1-hour sessions in staging).
 */
const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS) || 60 * 60 * 8;

/**
 * Reads the auth token from the httpOnly cookie.
 * Must only be called from Server Components or Server Actions.
 */
export async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Persists the auth token in a secure, httpOnly cookie.
 * Must only be called from Server Actions (cookies() is write-capable there).
 */
export async function setToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Secure by default in production so the session JWT is never sent over plain
    // HTTP (fail-safe). A production deployment that genuinely terminates HTTPS
    // upstream and serves the app over plain HTTP can opt out with
    // COOKIE_SECURE=false; outside production it stays off so local/proxy runs work.
    secure:
      process.env.NODE_ENV === 'production' &&
      process.env.COOKIE_SECURE !== 'false',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Removes the auth token cookie (logout). Best-effort: Next.js only allows
 * cookie mutation in Server Actions and Route Handlers, so when this runs
 * during Server Component render (a fetch helper reacting to a 401 from an
 * expired token) the deletion is skipped instead of crashing the render —
 * callers redirect to login right after, and the stale cookie is overwritten
 * by the next successful login.
 */
export async function clearToken(): Promise<void> {
  const jar = await cookies();
  try {
    jar.delete(COOKIE_NAME);
  } catch {
    // Server Component render: cookies are read-only here.
  }
}

/**
 * Returns the Authorization header object for openapi-fetch calls.
 */
export function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Coarse authentication gate for Server Components and Server Actions: returns
 * the session token, or redirects to login — preserving `next` — when there is
 * no session cookie.
 *
 * It only checks for the presence of the cookie; it does NOT validate the token
 * against the API. Callers that additionally call `/auth/me` still handle a 401
 * from that call and redirect via {@link loginHref}.
 */
export async function requireSession(next?: string | null): Promise<string> {
  const token = await getToken();
  if (!token) redirect(loginHref(next));
  return token;
}
