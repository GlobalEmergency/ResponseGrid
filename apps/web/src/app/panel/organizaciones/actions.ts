'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession, loginHref, authHeaders } from '@/lib/auth';
import { getT } from '@/i18n/server';

export type OrgActionResult =
  | { status: 'idle' }
  | { status: 'success'; id?: string }
  | { status: 'error'; message: string };

export async function createOrganizationAction(
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await requireSession('/panel/organizaciones');

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
    if (response.status === 401) redirect(loginHref('/panel/organizaciones'));
    return { status: 'error', message: t.organizaciones.err_create_failed };
  }

  revalidatePath('/panel/organizaciones');
  redirect(`/organizations/${data.id}/manage`);
}
