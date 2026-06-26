import { cookies } from 'next/headers';

const COOKIE_NAME = 'rh_token';

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
    // Secure only when explicitly enabled (set COOKIE_SECURE=true behind HTTPS).
    // Tying it to NODE_ENV breaks sessions when a production build is served over
    // plain HTTP (local runs, reverse proxies that don't forward HTTPS).
    secure: process.env.COOKIE_SECURE === 'true',
    // 8-hour session — coordinators don't need persistent logins
    maxAge: 60 * 60 * 8,
  });
}

/**
 * Removes the auth token cookie (logout).
 * Must only be called from Server Actions.
 */
export async function clearToken(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Returns the Authorization header object for openapi-fetch calls.
 */
export function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
