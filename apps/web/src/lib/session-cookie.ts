/**
 * Name of the httpOnly cookie that holds the session JWT. Lives in its own pure
 * module so both the server session helpers (`@/lib/auth`) and the edge proxy
 * (`proxy.ts`, which must not import `next/headers`) share one source of truth.
 */
export const SESSION_COOKIE = 'rh_token';
