import { type NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api';

/**
 * GET /api/geocode?q=<address>
 *
 * Proxies the backend geocoding endpoint so client components can call it
 * without hitting the backend directly (no CORS, no leaking API_URL).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  const { data, error } = await api.GET('/geocode', {
    params: { query: { q } },
  });

  if (error !== undefined || data === undefined) {
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data);
}
