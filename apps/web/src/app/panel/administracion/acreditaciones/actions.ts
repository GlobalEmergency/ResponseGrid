'use server';

import { revalidatePath } from 'next/cache';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';

export type AccreditationActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Local DTO that preserves the discriminated-union shape of `scope`.
 * The generated AccreditationViewDto has `scope: Record<string, never>` which
 * loses the union — we keep the original shape here so callers can compare
 * acc.scope === 'global' without TypeScript errors.
 */
export interface AccreditationDto {
  id: string;
  organizationId: string;
  scope: 'global' | { emergencyId: string };
  evidence?: string;
  grantedAt: string;
}

/** Fetch all accreditations, optionally filtered by org or emergency. */
export async function fetchAccreditations(
  organizationId?: string,
  emergencyId?: string,
): Promise<AccreditationDto[]> {
  const token = await getToken();
  if (!token) return [];

  const { data, error } = await api.GET('/accreditations', {
    params: { query: { organizationId, emergencyId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) return [];

  // Double-cast via unknown: the runtime shape matches AccreditationDto, but
  // the generated schema uses Record<string, never> for scope, losing the
  // 'global' | { emergencyId } union that the page relies on.
  return (data ?? []) as unknown as AccreditationDto[];
}

/** Grant an accreditation (POST /accreditations). */
export async function grantAccreditationAction(
  _prev: AccreditationActionResult,
  formData: FormData,
): Promise<AccreditationActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/acreditaciones');
  }

  const { t } = await getT();
  const ta = t.admin;

  const organizationId = String(formData.get('organizationId') ?? '').trim();
  const scopeType = String(formData.get('scopeType') ?? '').trim();
  const emergencyId = String(formData.get('emergencyId') ?? '').trim();
  const evidence = String(formData.get('evidence') ?? '').trim() || undefined;

  if (!organizationId) {
    return { status: 'error', message: ta.acc_err_org_required };
  }

  const scope: 'global' | { emergencyId: string } =
    scopeType === 'emergency' && emergencyId
      ? { emergencyId }
      : 'global';

  if (scopeType === 'emergency' && !emergencyId) {
    return { status: 'error', message: ta.acc_err_emergency_required };
  }

  const { error, response } = await api.POST('/accreditations', {
    body: { organizationId, scope, evidence },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/acreditaciones');
    }
    if (response.status === 403) {
      return { status: 'error', message: ta.acc_err_grant_forbidden };
    }
    if (response.status === 400) {
      return { status: 'error', message: ta.acc_err_invalid };
    }
    return { status: 'error', message: ta.acc_err_grant_generic };
  }

  revalidatePath('/panel/administracion/acreditaciones');
  return { status: 'success' };
}

/** Revoke an accreditation (DELETE /accreditations/{id}). */
export async function revokeAccreditationAction(
  id: string,
): Promise<AccreditationActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/acreditaciones');
  }

  const { t } = await getT();
  const ta = t.admin;

  const { error, response } = await api.DELETE('/accreditations/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/acreditaciones');
    }
    if (response.status === 403) {
      return { status: 'error', message: ta.acc_err_revoke_forbidden };
    }
    return { status: 'error', message: ta.acc_err_revoke_generic };
  }

  revalidatePath('/panel/administracion/acreditaciones');
  return { status: 'success' };
}
