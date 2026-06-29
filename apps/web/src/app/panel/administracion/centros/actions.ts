'use server';

import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

export type ResourceAdminListItem =
  components['schemas']['ResourceAdminViewDto'];
export type ResourceAdminDetail =
  components['schemas']['ResourceAdminDetailDto'];
export type ValidityReport = components['schemas']['ValidityReportDto'];

// Unlike the public listing, returns resources of every status and
// verification level (admin-only view).
export async function fetchAdminResources(): Promise<ResourceAdminListItem[]> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/centros');

  // Pull a generous page: the client filters/searches in-memory like the
  // users/organizations lists. (Pagination can be layered on later if needed.)
  const { data, error, response } = await api.GET('/resources', {
    params: { query: { limit: 100 } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/centros');
    }
    return [];
  }

  return (data?.items ?? []) as ResourceAdminListItem[];
}

// Returns null on 404 so the page can render a not-found state.
export async function fetchAdminResourceDetail(
  id: string,
): Promise<ResourceAdminDetail | null> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/administracion/centros/${id}`);

  const { data, error, response } = await api.GET('/resources/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/panel/administracion/centros/${id}`);
    }
    if (response.status === 404) return null;
    return null;
  }

  return (data ?? null) as ResourceAdminDetail | null;
}
