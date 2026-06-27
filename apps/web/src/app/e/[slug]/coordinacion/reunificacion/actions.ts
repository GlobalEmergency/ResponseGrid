'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders, clearToken } from '@/lib/auth';
import type { components } from '@reliefhub/api-client';

type UpdateReportStatusDto = components['schemas']['UpdateReportStatusDto'];

export type UpdateStatusState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export type AddSightingState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function updateReportStatus(
  slug: string,
  reportId: string,
  _prev: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reunificacion`);
  }

  const rawStatus = formData.get('status');
  const matchNote = (formData.get('matchNote') as string | null)?.trim() || undefined;

  const VALID_STATUSES: UpdateReportStatusDto['status'][] = [
    'open',
    'under_review',
    'matched',
    'closed',
  ];

  if (
    typeof rawStatus !== 'string' ||
    !VALID_STATUSES.includes(rawStatus as UpdateReportStatusDto['status'])
  ) {
    return { status: 'error', message: 'Estado no válido.' };
  }

  const { response, error } = await api.PATCH('/reunification/{reportId}/status', {
    params: { path: { reportId } },
    headers: authHeaders(token),
    body: {
      status: rawStatus as UpdateReportStatusDto['status'],
      ...(matchNote != null && { matchNote }),
    },
  });

  if (response.status === 401) {
    await clearToken();
    redirect('/login');
  }

  if (response.status === 403) {
    return {
      status: 'error',
      message: 'No tienes permisos para cambiar el estado de este reporte.',
    };
  }

  if (error !== undefined) {
    return {
      status: 'error',
      message: 'Error al actualizar el estado. Inténtalo de nuevo.',
    };
  }

  revalidatePath(`/e/${slug}/coordinacion/reunificacion`);
  return { status: 'success' };
}

export async function addSighting(
  slug: string,
  reportId: string,
  _prev: AddSightingState,
  formData: FormData,
): Promise<AddSightingState> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reunificacion`);
  }

  const location =
    (formData.get('sightingLocation') as string | null)?.trim() ?? '';
  const note = (formData.get('sightingNote') as string | null)?.trim() ?? '';

  if (location.length < 2) {
    return { status: 'error', message: 'El lugar del avistamiento es obligatorio.' };
  }
  if (note.length < 2) {
    return { status: 'error', message: 'La nota del avistamiento es obligatoria.' };
  }

  const { response, error } = await api.POST(
    '/reunification/{reportId}/sightings',
    {
      params: { path: { reportId } },
      headers: authHeaders(token),
      body: { location, note },
    },
  );

  if (response.status === 401) {
    await clearToken();
    redirect('/login');
  }

  if (response.status === 403) {
    return {
      status: 'error',
      message: 'No tienes permisos para añadir avistamientos.',
    };
  }

  if (error !== undefined) {
    return {
      status: 'error',
      message: 'Error al registrar el avistamiento. Inténtalo de nuevo.',
    };
  }

  revalidatePath(`/e/${slug}/coordinacion/reunificacion`);
  return { status: 'success' };
}
