import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginHref, sessionClearHref } from './safe-next';
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
 * expired token) the deletion is skipped instead of crashing the render.
 *
 * Returns whether the cookie was actually deleted, so callers can route the
 * real cleanup elsewhere when it wasn't — {@link redirectToLogin} sends those
 * through `GET /api/session/clear`, the Route Handler that CAN delete it.
 */
export async function clearToken(): Promise<boolean> {
  const jar = await cookies();
  try {
    jar.delete(COOKIE_NAME);
    return true;
  } catch {
    // Server Component render: cookies are read-only here.
    return false;
  }
}

/**
 * Single owner of the "session is invalid → go to login" move, safe from both
 * Server Actions and Server Component render. Deletes the session cookie when
 * the runtime allows it and redirects to login preserving `next`; when it
 * can't (render), it redirects through `GET /api/session/clear` so the stale
 * cookie is deleted for real instead of lingering until its maxAge.
 *
 * Use this instead of hand-writing `await clearToken(); redirect(loginHref(…))`
 * (issue #312 centralised that pattern).
 */
export async function redirectToLogin(next?: string | null): Promise<never> {
  const cleared = await clearToken();
  redirect(cleared ? loginHref(next) : sessionClearHref(next));
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
