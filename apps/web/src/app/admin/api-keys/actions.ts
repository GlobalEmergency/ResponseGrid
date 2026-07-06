'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, getToken, authHeaders, redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { parseDateInput } from '@/lib/parse-date-input';

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

export interface RoleView {
  id: string;
  description: string;
  defaultScopeType: string;
  permissions: string[];
}

export interface ServiceAccountGrantView {
  id: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  grantedAt: string;
  expiresAt: string | null;
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
  const token = await requireSession('/admin/api-keys');

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
      return redirectToLogin('/admin/api-keys');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No tienes permiso (apikey:create) en ese ámbito.',
      };
    }
    return { status: 'error', message: 'No se pudo crear la cuenta de servicio.' };
  }

  revalidatePath('/admin/api-keys');
  return { status: 'success', message: 'Cuenta de servicio creada.' };
}

export async function issueApiKeyAction(
  serviceAccountId: string,
  expiresAtInput?: string,
): Promise<IssueKeyResult> {
  const token = await requireSession('/admin/api-keys');

  const expiresAt = parseDateInput(expiresAtInput ?? '');

  const { data, error, response } = await api.POST(
    '/service-accounts/{serviceAccountId}/api-keys',
    {
      params: { path: { serviceAccountId } },
      body: expiresAt ? { expiresAt } : {},
      headers: authHeaders(token),
    },
  );

  if (error !== undefined || !data) {
    if (response.status === 403) {
      return { status: 'error', message: 'No autorizado para emitir claves.' };
    }
    return { status: 'error', message: 'No se pudo emitir la clave.' };
  }

  revalidatePath(`/admin/api-keys/${serviceAccountId}`);
  return { status: 'success', apiKey: data.apiKey, prefix: data.prefix };
}

export async function revokeApiKeyAction(
  keyId: string,
  serviceAccountId: string,
): Promise<ApiKeyActionResult> {
  const token = await requireSession('/admin/api-keys');

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

  revalidatePath(`/admin/api-keys/${serviceAccountId}`);
  return { status: 'success' };
}

export async function fetchRoles(): Promise<RoleView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/roles', {
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as RoleView[];
}

export async function fetchServiceAccountGrants(
  serviceAccountId: string,
): Promise<ServiceAccountGrantView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET(
    '/service-accounts/{serviceAccountId}/grants',
    {
      params: { path: { serviceAccountId } },
      headers: authHeaders(token),
    },
  );
  if (error !== undefined) return [];
  return (data ?? []) as ServiceAccountGrantView[];
}

export async function grantServiceAccountRoleAction(
  serviceAccountId: string,
  _prev: ApiKeyActionResult,
  formData: FormData,
): Promise<ApiKeyActionResult> {
  const token = await requireSession(`/admin/api-keys/${serviceAccountId}`);

  const roleId = String(formData.get('roleId') ?? '').trim();
  const scopeType = String(formData.get('scopeType') ?? '').trim();
  const scopeId = String(formData.get('scopeId') ?? '').trim();
  const expiresAt = parseDateInput(String(formData.get('expiresAt') ?? ''));

  if (!roleId || !scopeType) {
    return { status: 'error', message: 'Rol y ámbito son obligatorios.' };
  }
  if (scopeType !== 'platform' && !scopeId) {
    return {
      status: 'error',
      message: 'El ID de ámbito es obligatorio salvo para "Plataforma".',
    };
  }

  const { error, response } = await api.POST('/grants', {
    body: {
      principalId: serviceAccountId,
      roleId,
      scopeType: scopeType as
        | 'platform'
        | 'organization'
        | 'emergency'
        | 'group'
        | 'entity',
      ...(scopeType !== 'platform' ? { scopeId } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin(`/admin/api-keys/${serviceAccountId}`);
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No autorizado: no puedes conceder ese rol en ese ámbito (o sería escalada de privilegios).',
      };
    }
    if (response.status === 400) {
      return { status: 'error', message: 'Datos inválidos. Revisa el ámbito.' };
    }
    return { status: 'error', message: 'No se pudo conceder el permiso.' };
  }

  revalidatePath(`/admin/api-keys/${serviceAccountId}`);
  return { status: 'success', message: 'Permiso concedido.' };
}

export async function revokeServiceAccountGrantAction(
  grantId: string,
  serviceAccountId: string,
): Promise<ApiKeyActionResult> {
  const token = await requireSession(`/admin/api-keys/${serviceAccountId}`);

  const { error, response } = await api.DELETE('/grants/{id}', {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No autorizado para revocar este permiso.',
      };
    }
    return { status: 'error', message: 'No se pudo revocar el permiso.' };
  }

  revalidatePath(`/admin/api-keys/${serviceAccountId}`);
  return { status: 'success' };
}
