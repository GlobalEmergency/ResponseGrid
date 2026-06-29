'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';

export type ApiKeyActionResult =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

export type IssueKeyResult =
  | { status: 'idle' }
  | { status: 'success'; apiKey: string; prefix: string }
  | { status: 'error'; message: string };

export interface ServiceAccountView {
  id: string;
  name: string;
  ownerOrganizationId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface ApiKeyView {
  id: string;
  prefix: string;
  active: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export async function fetchServiceAccounts(): Promise<ServiceAccountView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/service-accounts', {
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as ServiceAccountView[];
}

export async function fetchApiKeys(
  serviceAccountId: string,
): Promise<ApiKeyView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET(
    '/service-accounts/{serviceAccountId}/api-keys',
    {
      params: { path: { serviceAccountId } },
      headers: authHeaders(token),
    },
  );
  if (error !== undefined) return [];
  return (data ?? []) as ApiKeyView[];
}

export async function createServiceAccountAction(
  _prev: ApiKeyActionResult,
  formData: FormData,
): Promise<ApiKeyActionResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/api-keys');

  const name = String(formData.get('name') ?? '').trim();
  const ownerOrganizationId = String(
    formData.get('ownerOrganizationId') ?? '',
  ).trim();

  if (!name) return { status: 'error', message: 'El nombre es obligatorio.' };

  const { error, response } = await api.POST('/service-accounts', {
    body: {
      name,
      ...(ownerOrganizationId ? { ownerOrganizationId } : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/api-keys');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No tienes permiso (apikey:create) en ese ámbito.',
      };
    }
    return { status: 'error', message: 'No se pudo crear la cuenta de servicio.' };
  }

  revalidatePath('/panel/administracion/api-keys');
  return { status: 'success', message: 'Cuenta de servicio creada.' };
}

export async function issueApiKeyAction(
  serviceAccountId: string,
): Promise<IssueKeyResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/api-keys');

  const { data, error, response } = await api.POST(
    '/service-accounts/{serviceAccountId}/api-keys',
    {
      params: { path: { serviceAccountId } },
      body: {},
      headers: authHeaders(token),
    },
  );

  if (error !== undefined || !data) {
    if (response.status === 403) {
      return { status: 'error', message: 'No autorizado para emitir claves.' };
    }
    return { status: 'error', message: 'No se pudo emitir la clave.' };
  }

  revalidatePath(`/panel/administracion/api-keys/${serviceAccountId}`);
  return { status: 'success', apiKey: data.apiKey, prefix: data.prefix };
}

export async function revokeApiKeyAction(
  keyId: string,
  serviceAccountId: string,
): Promise<ApiKeyActionResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/api-keys');

  const { error, response } = await api.DELETE('/api-keys/{keyId}', {
    params: { path: { keyId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 403) {
      return { status: 'error', message: 'No autorizado para revocar la clave.' };
    }
    return { status: 'error', message: 'No se pudo revocar la clave.' };
  }

  revalidatePath(`/panel/administracion/api-keys/${serviceAccountId}`);
  return { status: 'success' };
}
