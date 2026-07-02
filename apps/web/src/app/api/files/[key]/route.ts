import { type NextRequest, NextResponse } from 'next/server';
import { getToken, authHeaders } from '@/lib/auth';

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

/**
 * GET /api/files/:key
 *
 * Same-origin, authenticated proxy for stored files. The backend now requires a
 * Bearer token on GET /files/:key (files are no longer world-readable), but an
 * <img>/<a> in the browser cannot attach the httpOnly session cookie as a
 * bearer header. This route reads the session token server-side and forwards
 * the request, streaming the file back so images keep rendering while access is
 * gated by the session.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const token = await getToken();
  if (token === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await params;
  // Defence-in-depth: the dynamic segment is already a single path component,
  // but reject anything that could escape the /files/ prefix upstream.
  if (key.includes('/') || key.includes('\\') || key.includes('..')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/files/${encodeURIComponent(key)}`, {
    headers: authHeaders(token),
  });

  if (!upstream.ok || upstream.body === null) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: upstream.status === 401 ? 401 : 404 },
    );
  }

  const headers = new Headers();
  const contentType =
    upstream.headers.get('content-type') ?? 'application/octet-stream';
  headers.set('content-type', contentType);
  headers.set('x-content-type-options', 'nosniff');
  // Private: cacheable by the user's browser but never by shared proxies, since
  // the content is access-controlled.
  headers.set('cache-control', 'private, max-age=300');

  return new NextResponse(upstream.body, { status: 200, headers });
}
