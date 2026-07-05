'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { getT } from '@/i18n/server';

export type OrgActionResult =
  | { status: 'idle' }
  | { status: 'success'; id?: string }
  | { status: 'error'; message: string };

export async function addMemberAction(
  orgId: string,
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await requireSession(`/organizations/${orgId}/manage`);

  const { t } = await getT();

  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { status: 'error', message: t.organizaciones.err_email_required };
  }

  const { error, response } = await api.POST('/organizations/{id}/members', {
    params: { path: { id: orgId } },
    headers: authHeaders(token),
    body: { email },
  });

  if (error !== undefined) {
    if (response.status === 401) return redirectToLogin(`/organizations/${orgId}/manage`);
    if (response.status === 403) {
      return { status: 'error', message: t.organizaciones.err_owner_only };
    }
    if (response.status === 404) {
      return { status: 'error', message: t.organizaciones.err_user_not_found };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.organizaciones.err_already_member };
    }
    return { status: 'error', message: t.organizaciones.err_add_member_failed };
  }

  revalidatePath(`/organizations/${orgId}/manage`);
  return { status: 'success' };
}

export async function removeMemberAction(
  orgId: string,
  userId: string,
): Promise<OrgActionResult> {
  const token = await requireSession(`/organizations/${orgId}/manage`);

  const { t } = await getT();

  const { error, response } = await api.DELETE('/organizations/{id}/members/{userId}', {
    params: { path: { id: orgId, userId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) return redirectToLogin(`/organizations/${orgId}/manage`);
    if (response.status === 403) {
      return { status: 'error', message: t.organizaciones.err_owner_only };
    }
    if (response.status === 422) {
      return { status: 'error', message: t.organizaciones.err_owner_cannot_remove_self };
    }
    return { status: 'error', message: t.organizaciones.err_remove_member_failed };
  }

  revalidatePath(`/organizations/${orgId}/manage`);
  return { status: 'success' };
}
