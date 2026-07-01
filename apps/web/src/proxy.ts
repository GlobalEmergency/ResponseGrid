import { NextResponse, type NextRequest } from 'next/server';
import { loginHref } from '@/lib/safe-next';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Optimistic auth gate — Next 16 "proxy" (the renamed middleware).
 *
 * Runs at the edge before rendering and bounces unauthenticated visitors of
 * fully-protected areas straight to login, preserving where they were headed
 * via `?next=` (built through the same {@link loginHref} contract as the rest
 * of the app). It only checks for the presence of the session cookie.
 *
 * This is deliberately an OPTIMISTIC check, per the Next docs: proxy must not be
 * the sole gate. Every protected page and every server action still calls
 * `requireSession` and validates the token against the API — server actions in
 * particular aren't reliably covered by the matcher. So if this matcher ever
 * drifts, the per-page gate still protects the route; the only thing lost is the
 * earlier redirect.
 *
 * Scope: whole segments that are protected in their entirety (`/panel/*` and the
 * coordination workspace). Scattered single-page forms under `/e/:slug`
 * (registrar, peticion, …) keep their authoritative per-page `requireSession`
 * gate rather than being enumerated here, where the list would silently drift.
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(loginHref(pathname + search), request.url));
}

export const config = {
  matcher: [
    '/panel/:path*',
    '/e/:slug/coordinacion/:path*',
  ],
};
