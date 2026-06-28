'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';

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
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loginPath(orgId: string): string {
  return `/login?next=/administracion/organizacion/${orgId}`;
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

/** Members of an organization = the grants made at its scope. */
export async function fetchOrgGrants(orgId: string): Promise<ScopeGrant[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/grants/at-scope', {
    params: { query: { scopeType: 'organization', scopeId: orgId } },
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

/** Grant a catalog role to a user (by email or id) within this organization. */
export async function grantOrgRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const orgId = String(formData.get('orgId') ?? '').trim();
  const token = await getToken();
  if (!token) redirect(loginPath(orgId));

  const principalInput = String(formData.get('principal') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();
  if (!orgId || !principalInput || !roleId) {
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
      scopeType: 'organization',
      scopeId: orgId,
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(loginPath(orgId));
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No puedes conceder ese rol aquí: requiere permisos que tú no tienes en esta organización (atenuación).',
      };
    }
    if (response.status === 400) {
      return { status: 'error', message: 'Datos inválidos. Revisa el rol.' };
    }
    return { status: 'error', message: 'No se pudo conceder el rol.' };
  }

  revalidatePath(`/administracion/organizacion/${orgId}`);
  return { status: 'success', message: 'Rol concedido.' };
}

/** Revoke a grant within this organization. */
export async function revokeOrgGrantAction(
  grantId: string,
  orgId: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (!token) redirect(loginPath(orgId));

  const { error, response } = await api.DELETE('/grants/{id}', {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(loginPath(orgId));
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No tienes permiso para revocar este rol.',
      };
    }
    return { status: 'error', message: 'No se pudo revocar el rol.' };
  }

  revalidatePath(`/administracion/organizacion/${orgId}`);
  return { status: 'success' };
}
