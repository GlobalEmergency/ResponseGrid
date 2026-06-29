'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { getT } from '@/i18n/server';

export type OrgActionResult =
  | { status: 'idle' }
  | { status: 'success'; id?: string }
  | { status: 'error'; message: string };

export async function createOrganizationAction(
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/organizaciones');
  }

  const { t } = await getT();

  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const taxId = String(formData.get('taxId') ?? '').trim() || undefined;
  const contactEmail = String(formData.get('contactEmail') ?? '').trim() || undefined;
  const contactPhone = String(formData.get('contactPhone') ?? '').trim() || undefined;

  if (!name || !type) {
    return { status: 'error', message: t.organizaciones.err_name_type_required };
  }
  if (!contactEmail || !contactPhone) {
    return { status: 'error', message: t.organizaciones.err_contact_required };
  }

  const { data, error, response } = await api.POST('/organizations', {
    headers: authHeaders(token),
    body: { name, type: type as 'ngo' | 'company' | 'public_admin' | 'association' | 'transport_operator' | 'other', taxId, contactEmail, contactPhone },
  });

  if (error !== undefined || data === undefined) {
    if (response.status === 401) redirect('/login?next=/panel/organizaciones');
    return { status: 'error', message: t.organizaciones.err_create_failed };
  }

  revalidatePath('/panel/organizaciones');
  redirect(`/panel/organizaciones/${data.id}`);
}

export async function addMemberAction(
  orgId: string,
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/panel/organizaciones/${orgId}`);
  }

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
    if (response.status === 401) redirect(`/login?next=/panel/organizaciones/${orgId}`);
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

  revalidatePath(`/panel/organizaciones/${orgId}`);
  return { status: 'success' };
}

export async function removeMemberAction(
  orgId: string,
  userId: string,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/panel/organizaciones/${orgId}`);
  }

  const { t } = await getT();

  const { error, response } = await api.DELETE('/organizations/{id}/members/{userId}', {
    params: { path: { id: orgId, userId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) redirect(`/login?next=/panel/organizaciones/${orgId}`);
    if (response.status === 403) {
      return { status: 'error', message: t.organizaciones.err_owner_only };
    }
    if (response.status === 422) {
      return { status: 'error', message: t.organizaciones.err_owner_cannot_remove_self };
    }
    return { status: 'error', message: t.organizaciones.err_remove_member_failed };
  }

  revalidatePath(`/panel/organizaciones/${orgId}`);
  return { status: 'success' };
}
