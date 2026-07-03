import { type NextRequest, NextResponse } from 'next/server';
import { loginHref } from '@/lib/safe-next';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * GET /api/session/clear?next=<ruta>
 *
 * Deletes the stale session cookie and forwards to login. Server Component
 * render paths cannot mutate cookies, so when they detect an expired session
 * (401 with a token present) they redirect here — the one place besides a
 * Server Action where deletion is legal — instead of leaving the dead cookie
 * alive until its maxAge (#312). `next` is sanitised by loginHref, so an
 * attacker-crafted link through this handler cannot open-redirect; the only
 * other thing it can do is delete the visitor's own already-invalid cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = request.nextUrl.searchParams.get('next');
  const response = NextResponse.redirect(
    new URL(loginHref(next), request.nextUrl),
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
