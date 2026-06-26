'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import type { components } from '@reliefhub/api-client';

export type PublicStatus = components['schemas']['ResourceViewDto']['publicStatus'];

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Fetch resources owned by the authenticated user for a given emergency.
 * Uses raw fetch because GET /emergencies/{id}/resources/mine is not yet
 * in the generated openapi-fetch schema.
 */
export async function fetchMyResources(
  emergencyId: string,
  slug: string,
): Promise<components['schemas']['ResourceViewDto'][]> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  const res = await fetch(
    `${API_BASE}/emergencies/${emergencyId}/resources/mine`,
    { headers: { ...authHeaders(token), 'Content-Type': 'application/json' } },
  );

  if (res.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  if (!res.ok) {
    return [];
  }

  return (await res.json()) as components['schemas']['ResourceViewDto'][];
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

  const res = await fetch(`${API_BASE}/resources/${resourceId}/status`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (res.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/mis-puntos`);
  }

  if (res.status === 403) {
    return { status: 'error', message: 'No tienes permisos para cambiar el estado de este punto.' };
  }

  if (!res.ok) {
    return { status: 'error', message: 'No se pudo actualizar el estado. Inténtalo de nuevo.' };
  }

  revalidatePath(`/e/${slug}/mis-puntos`);
  revalidatePath(`/e/${slug}`);
  return { status: 'success' };
}
