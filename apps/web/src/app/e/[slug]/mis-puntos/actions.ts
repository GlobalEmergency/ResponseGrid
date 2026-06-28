'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

export type PublicStatus = components['schemas']['ResourceViewDto']['publicStatus'];

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Fetch resources owned by the authenticated user for a given emergency.
 */
export async function fetchMyResources(
  emergencyId: string,
  slug: string,
): Promise<components['schemas']['ResourceViewDto'][]> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  const { data, response } = await api.GET(
    '/emergencies/{emergencyId}/resources/mine',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
    },
  );

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  if (!response.ok || data == null) {
    return [];
  }

  return data;
}

/**
 * Update the publicStatus of a resource the authenticated user owns.
 * Calls POST /resources/{resourceId}/status (owner or coordinator).
 */
export async function updateResourceStatus(
  resourceId: string,
  status: PublicStatus,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  const { response } = await api.POST('/resources/{resourceId}/status', {
    params: { path: { resourceId } },
    // status is narrowed by the caller: 'hidden' is excluded by UpdateResourcePublicStatusDto.
    body: { status: status as 'active' | 'saturated' | 'paused' | 'closed' },
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  if (response.status === 403) {
    const { t } = await getT();
    return { status: 'error', message: t.account.update_status_forbidden };
  }

  if (!response.ok) {
    const { t } = await getT();
    return { status: 'error', message: t.account.update_status_failed };
  }

  revalidatePath(`/e/${slug}/mis-puntos`);
  revalidatePath(`/e/${slug}`);
  return { status: 'success' };
}
