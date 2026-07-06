/**
 * Server-side proxy core for public resource browsing (#268).
 *
 * The public resource list / nearby / in-bounds endpoints redact `contact`
 * (the PII of non-official points) for anonymous callers and reveal it when a
 * valid Bearer token is present (#267). The browser cannot attach the httpOnly
 * `rh_token` cookie as a Bearer header, so ResourceList's client-side refetches
 * (filter / paginate / nearby) always looked anonymous and lost the contact for
 * logged-in users — even though the server-rendered detail page showed it.
 *
 * This module forwards those specific reads through the Next server, attaching
 * the session token server-side. The token is NEVER exposed to client JS, and
 * two invariants keep the #267 security property intact:
 *
 *   - an allowlist restricts forwarding to the public `resources` read family
 *     ONLY, so the session token can never be relayed to any other API endpoint
 *     (a client cannot turn this proxy into an authenticated call to `/auth/me`,
 *     a management route, etc.);
 *   - responses are marked non-cacheable (`private, no-store`): they vary by the
 *     per-user session cookie, so a contact-revealed response can never be
 *     served from a shared cache to an anonymous visitor.
 *
 * An anonymous caller (no cookie) sends no Authorization header, so the API
 * still redacts `contact` to `null` — exactly as it does today.
 *
 * Kept as a pure, framework-free module (no `next/*`, no `@/` aliases) so the
 * security wiring is unit-testable under `node --test`.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Static sub-routes of `.../public/resources` that are safe to proxy. */
const SUBRESOURCES = new Set(['nearby', 'in-bounds', 'facets']);

/**
 * Allowlist: the ONLY upstream paths this proxy will attach the session token
 * to. Restricted to the public `resources` read family for a single emergency:
 *
 *   emergencies/{uuid}/public/resources                  (list)
 *   emergencies/{uuid}/public/resources/nearby           (nearby)
 *   emergencies/{uuid}/public/resources/in-bounds        (map viewport)
 *   emergencies/{uuid}/public/resources/facets           (filter counts)
 *   emergencies/{uuid}/public/resources/{uuid}           (detail)
 *
 * Everything else is rejected, so the session token can never reach another
 * endpoint. Path traversal is impossible: each segment is validated and the
 * emergency id must be a UUID.
 */
export function isAllowedResourcePath(segments: readonly string[]): boolean {
  if (
    segments.some(
      (s) =>
        s === '' ||
        s === '.' ||
        s === '..' ||
        s.includes('/') ||
        s.includes('\\'),
    )
  ) {
    return false;
  }
  if (segments.length < 4 || segments.length > 5) return false;

  const [context, emergencyId, scope, resources, sub] = segments;
  if (
    context !== 'emergencies' ||
    scope !== 'public' ||
    resources !== 'resources'
  ) {
    return false;
  }
  if (!UUID_RE.test(emergencyId)) return false;
  if (segments.length === 5 && !(SUBRESOURCES.has(sub) || UUID_RE.test(sub))) {
    return false;
  }
  return true;
}

/** Minimal `fetch` shape used by the proxy — injectable so tests can fake the API. */
export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; cache: 'no-store' },
) => Promise<Response>;

export interface ProxyRequest {
  /** Upstream API base URL (no trailing slash), e.g. `http://localhost:3000`. */
  base: string;
  /** Path segments after the proxy prefix, e.g. `['emergencies', id, 'public', 'resources']`. */
  segments: string[];
  /** Raw query string including the leading `?` (or empty). */
  search: string;
  /** Session token read server-side, or `null` for an anonymous visitor. */
  token: string | null;
  fetchFn: FetchLike;
}

/**
 * Forwards an allowlisted public-resource read to the API, attaching the
 * session token as a Bearer when present. Returns a non-cacheable response.
 */
export async function proxyPublicResources(req: ProxyRequest): Promise<Response> {
  if (!isAllowedResourcePath(req.segments)) {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  const url = `${req.base}/${req.segments.join('/')}${req.search}`;
  const headers: Record<string, string> = {};
  // Attach the token ONLY server-side; an anonymous visitor (no token) sends no
  // Authorization header, so the API keeps redacting `contact` (#267).
  if (req.token !== null && req.token !== '') {
    headers.Authorization = `Bearer ${req.token}`;
  }

  let upstream: Response;
  try {
    upstream = await req.fetchFn(url, { headers, cache: 'no-store' });
  } catch {
    return jsonResponse({ error: 'Upstream request failed' }, 502);
  }

  const body = await upstream.text();
  const contentType =
    upstream.headers.get('content-type') ?? 'application/json';
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': contentType,
      // Per-user (varies by the session cookie): never store in a shared cache,
      // so a contact-revealed response can't leak to an anonymous visitor.
      'cache-control': 'private, no-store',
    },
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-store',
    },
  });
}
