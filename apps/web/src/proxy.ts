import { NextResponse, type NextRequest } from 'next/server';
import { loginHref } from '@/lib/safe-next';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import { plataformaActiva, rutaAbiertaSinPlataforma, rutaProtegida } from '@/lib/plataforma';

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
 * Scope: whole segments that are protected in their entirety (`/dashboard/*`,
 * `/admin/*`, the `/organizations` auth workspace, `/panel/*` and the emergency
 * management workspace). Scattered single-page forms under `/e/:slug`
 * (registrar, peticion, …) keep their authoritative per-page `requireSession`
 * gate rather than being enumerated here, where the list would silently drift.
 *
 * SOS Galápagos: con `PLATAFORMA_ACTIVA=false` (ver lib/plataforma.ts) el sitio
 * publica solo la portada, lo legal y los estáticos. Cualquier otra ruta de la
 * app vuelve a la portada (o da 404 si no es una lectura). Por eso el matcher
 * cubre todo menos los estáticos de Next, y las áreas protegidas se deciden
 * aquí con `rutaProtegida`.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!plataformaActiva()) {
    if (rutaAbiertaSinPlataforma(pathname)) return NextResponse.next();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new NextResponse(null, { status: 404 });
    }
    // Temporal (307): la plataforma puede volver a activarse.
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!rutaProtegida(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL(loginHref(pathname + search), request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
