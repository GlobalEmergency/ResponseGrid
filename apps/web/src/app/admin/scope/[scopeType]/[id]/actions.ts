'use server';

import { revalidatePath } from 'next/cache';
import { getToken, requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import { parseDateInput } from '@/lib/parse-date-input';

export interface RoleView {
  id: string;
  description: string;
  defaultScopeType: string;
  permissions: string[];
}

export interface ScopeGrant {
  id: string;
  principalId: string;
  principalType: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  grantedByPrincipalId: string | null;
  grantedAt: string;
  expiresAt: string | null;
  principalName: string | null;
  principalEmail: string | null;
}

export interface ServiceAccountView {
  id: string;
  name: string;
  ownerOrganizationId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface ServiceAccountGrantView {
  id: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  grantedAt: string;
  expiresAt: string | null;
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScopeType = 'organization' | 'group' | 'emergency';

function path(scopeType: string, id: string): string {
  return `/admin/scope/${scopeType}/${id}`;
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

export async function fetchScopeGrants(
  scopeType: ScopeType,
  scopeId: string,
): Promise<ScopeGrant[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/grants/at-scope', {
    params: { query: { scopeType, scopeId } },
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as ScopeGrant[];
}

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

async function resolvePrincipalId(
  token: string,
  input: string,
): Promise<string | null> {
  const query = input.trim();
  if (!query) return null;
  if (UUID_RE.test(query)) return query;
  const { data, error } = await api.GET('/users/lookup', {
    params: { query: { email: query } },
    headers: authHeaders(token),
  });
  if (error !== undefined || !data) return null;
  return data.id;
}

export async function grantRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const scopeType = String(formData.get('scopeType') ?? '').trim() as ScopeType;
  const scopeId = String(formData.get('scopeId') ?? '').trim();
  const token = await requireSession(path(scopeType, scopeId));

  const principalInput = String(formData.get('principal') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();
  const expiresAt = parseDateInput(String(formData.get('expiresAt') ?? ''));
  if (!scopeType || !scopeId || !principalInput || !roleId) {
    return { status: 'error', message: 'Indica el usuario y el rol.' };
  }

  const principalId = await resolvePrincipalId(token, principalInput);
  if (!principalId) {
    return {
      status: 'error',
      message: 'No se encontró ningún usuario con ese email o ID.',
    };
  }

  const { error, response } = await api.POST('/grants', {
    body: {
      principalId,
      roleId,
      scopeType,
      scopeId,
      ...(expiresAt ? { expiresAt } : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin(path(scopeType, scopeId));
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No puedes conceder ese rol aquí: requiere permisos que tú no tienes en este ámbito (atenuación).',
      };
    }
    if (response.status === 400) {
      return { status: 'error', message: 'Datos inválidos. Revisa el rol.' };
    }
    return { status: 'error', message: 'No se pudo conceder el rol.' };
  }

  revalidatePath(path(scopeType, scopeId));
  return { status: 'success', message: 'Rol concedido.' };
}

export async function revokeGrantAction(
  grantId: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<ActionResult> {
  const token = await requireSession(path(scopeType, scopeId));

  const { error, response } = await api.DELETE('/grants/{id}', {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin(path(scopeType, scopeId));
    }
    if (response.status === 403) {
      return { status: 'error', message: 'No tienes permiso para revocar este rol.' };
    }
    return { status: 'error', message: 'No se pudo revocar el rol.' };
  }

  revalidatePath(path(scopeType, scopeId));
  return { status: 'success' };
}

// Service accounts exist only at organization scope.
export async function fetchOrgServiceAccounts(
  orgId: string,
): Promise<ServiceAccountView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET(
    '/organizations/{organizationId}/service-accounts',
    {
      params: { path: { organizationId: orgId } },
      headers: authHeaders(token),
    },
  );
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
  orgId: string,
  name: string,
): Promise<ActionResult> {
  const token = await requireSession(path('organization', orgId));
  if (!name.trim()) return { status: 'error', message: 'El nombre es obligatorio.' };

  const { error, response } = await api.POST('/service-accounts', {
    body: { name: name.trim(), ownerOrganizationId: orgId },
    headers: authHeaders(token),
  });
  if (error !== undefined) {
    if (response.status === 403) {
      return { status: 'error', message: 'No tienes permiso para crear cuentas de servicio aquí.' };
    }
    return { status: 'error', message: 'No se pudo crear la cuenta de servicio.' };
  }
  revalidatePath(path('organization', orgId));
  return { status: 'success', message: 'Cuenta de servicio creada.' };
}

export type IssueKeyResult =
  | { status: 'idle' }
  | { status: 'success'; apiKey: string }
  | { status: 'error'; message: string };

export async function issueApiKeyAction(
  serviceAccountId: string,
): Promise<IssueKeyResult> {
  const token = await getToken();
  if (!token) return { status: 'error', message: 'Sesión expirada.' };
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
      return { status: 'error', message: 'No tienes permiso para emitir claves.' };
    }
    return { status: 'error', message: 'No se pudo emitir la API key.' };
  }
  return { status: 'success', apiKey: data.apiKey };
}

export async function revokeApiKeyAction(keyId: string): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { status: 'error', message: 'Sesión expirada.' };
  const { error, response } = await api.DELETE('/api-keys/{keyId}', {
    params: { path: { keyId } },
    headers: authHeaders(token),
  });
  if (error !== undefined) {
    if (response.status === 403) {
      return { status: 'error', message: 'No tienes permiso para revocar esta clave.' };
    }
    return { status: 'error', message: 'No se pudo revocar la clave.' };
  }
  return { status: 'success' };
}

// Grants of a service account — the authority its keys inherit (any scope).
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
  roleId: string,
  scopeType: string,
  scopeId: string,
  expiresAtInput: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { status: 'error', message: 'Sesión expirada.' };

  if (!roleId || !scopeType) {
    return { status: 'error', message: 'Rol y ámbito son obligatorios.' };
  }
  if (scopeType !== 'platform' && !scopeId.trim()) {
    return {
      status: 'error',
      message: 'El ID de ámbito es obligatorio salvo para "Plataforma".',
    };
  }
  const expiresAt = parseDateInput(expiresAtInput);

  const { error, response } = await api.POST('/grants', {
    body: {
      principalId: serviceAccountId,
      principalType: 'service_account',
      roleId,
      scopeType: scopeType as
        | 'platform'
        | 'organization'
        | 'emergency'
        | 'group'
        | 'entity',
      ...(scopeType !== 'platform' ? { scopeId: scopeId.trim() } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin('/admin');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No autorizado: no puedes conceder ese rol en ese ámbito (atenuación).',
      };
    }
    if (response.status === 400) {
      return { status: 'error', message: 'Datos inválidos. Revisa el ámbito.' };
    }
    return { status: 'error', message: 'No se pudo conceder el permiso.' };
  }
  return { status: 'success', message: 'Permiso concedido.' };
}

export async function revokeServiceAccountGrantAction(
  grantId: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { status: 'error', message: 'Sesión expirada.' };
  const { error, response } = await api.DELETE('/grants/{id}', {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });
  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin('/admin');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No tienes permiso para revocar este permiso.',
      };
    }
    return { status: 'error', message: 'No se pudo revocar el permiso.' };
  }
  return { status: 'success' };
}
