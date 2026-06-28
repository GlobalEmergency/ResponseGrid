'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';

export type GrantActionResult =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

export interface RoleView {
  id: string;
  description: string;
  defaultScopeType: string;
  permissions: string[];
}

export interface GrantView {
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

export async function fetchRoles(): Promise<RoleView[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/roles', {
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as RoleView[];
}

export async function fetchGrants(principalId: string): Promise<GrantView[]> {
  const token = await getToken();
  if (!token || !principalId) return [];
  const { data, error } = await api.GET('/grants', {
    params: { query: { principalId } },
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as GrantView[];
}

export async function grantRoleAction(
  _prev: GrantActionResult,
  formData: FormData,
): Promise<GrantActionResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/admin/permisos');

  const principalId = String(formData.get('principalId') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();
  const scopeType = String(formData.get('scopeType') ?? '').trim();
  const scopeId = String(formData.get('scopeId') ?? '').trim();
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();

  if (!principalId || !roleId || !scopeType) {
    return { status: 'error', message: 'Principal, rol y ámbito son obligatorios.' };
  }
  if (scopeType !== 'platform' && !scopeId) {
    return {
      status: 'error',
      message: 'El ID de ámbito es obligatorio salvo para "Plataforma".',
    };
  }

  const { error, response } = await api.POST('/grants', {
    body: {
      principalId,
      roleId,
      scopeType: scopeType as
        | 'platform'
        | 'organization'
        | 'emergency'
        | 'group'
        | 'entity',
      ...(scopeType !== 'platform' ? { scopeId } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/admin/permisos');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No autorizado: no puedes conceder ese rol en ese ámbito (o sería escalada de privilegios).',
      };
    }
    if (response.status === 400) {
      return { status: 'error', message: 'Datos inválidos. Revisa el principal y el ámbito.' };
    }
    return { status: 'error', message: 'No se pudo conceder el rol.' };
  }

  revalidatePath('/admin/permisos');
  return { status: 'success', message: 'Rol concedido.' };
}

export async function revokeGrantAction(
  grantId: string,
): Promise<GrantActionResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/admin/permisos');

  const { error, response } = await api.DELETE('/grants/{id}', {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 403) {
      return { status: 'error', message: 'No autorizado para revocar este grant.' };
    }
    return { status: 'error', message: 'No se pudo revocar el grant.' };
  }

  revalidatePath('/admin/permisos');
  return { status: 'success' };
}
