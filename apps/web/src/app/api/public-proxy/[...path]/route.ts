import { type NextRequest } from 'next/server';
import { getToken } from '@/lib/auth';
import { proxyPublicResources } from './proxy-core';

/**
 * GET /api/public-proxy/emergencies/:id/public/resources[/...]
 *
 * Same-origin proxy for the public resource list / nearby / in-bounds reads
 * that {@link ResourceList} refetches client-side (#268). It reads the httpOnly
 * `rh_token` cookie server-side and forwards it as a Bearer to the API, so a
 * logged-in user sees the (non-official) `contact` in the list cards too — not
 * only on the server-rendered detail page.
 *
 * Security (enforced in {@link proxyPublicResources}): the token is attached
 * server-side only and is relayed strictly to the allowlisted public
 * `resources` read family. An anonymous visitor sends no cookie → no
 * Authorization header → the API still redacts `contact` to null (#267).
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

// Per-user (reads the session cookie): must never be statically cached.
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const token = await getToken();
  return proxyPublicResources({
    base: API_BASE,
    segments: path,
    search: request.nextUrl.search,
    token,
    fetchFn: fetch,
  });
}
