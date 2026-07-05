import { type NextRequest, NextResponse } from 'next/server';
import { loginHref } from '@/lib/safe-next';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * GET /api/session/clear?next=<ruta>
 *
 * Deletes the session cookie and forwards to login. Server Component render
 * paths cannot mutate cookies, so when they detect an expired session (401
 * with a token present) they redirect here — the one place besides a Server
 * Action where deletion is legal — instead of leaving the dead cookie alive
 * until its maxAge (#312).
 *
 * This is, by design, an unauthenticated logout endpoint: it deletes the
 * cookie without validating the token (a pre-check against the API would
 * fail open or closed during an outage — the very moment this path fires).
 * A crafted cross-site link here can therefore force-log-out a user with a
 * valid session; accepted as low impact (nuisance, no data exposure). The
 * guarded risk is open redirect, prevented by loginHref/safeNextPath — which
 * also reject /api/* as `next`, so this handler cannot be chained into a
 * login loop.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = request.nextUrl.searchParams.get('next');
  // Base on request.url (as proxy.ts does) so both redirect builders agree.
  const response = NextResponse.redirect(new URL(loginHref(next), request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
