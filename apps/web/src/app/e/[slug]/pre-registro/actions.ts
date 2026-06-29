'use server';

import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { MATERIAL_CATEGORIES } from '@/lib/categories';
import { parseSupplyLines } from '@/lib/supply-lines';

/** Narrow a free string to a known material category slug (single source). */
function isMaterialCategory(v: string): boolean {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(v);
}

export type PreRegState =
  | { status: 'idle' }
  | { status: 'success'; id: string; code: string }
  | { status: 'error'; message: string };

/**
 * Citizen delivery pre-registration (#130). Public, no login: the backend
 * endpoint uses an optional-JWT guard, so a person can declare what they'll
 * bring to a collection point and get a short code + QR (the comprobante) to
 * present at the desk. Consumes the already-shipped `POST .../donation-intakes`.
 */
export async function submitPreRegistration(
  emergencyId: string,
  resourceId: string,
  _prev: PreRegState,
  formData: FormData,
): Promise<PreRegState> {
  const { t } = await getT();
  const tp = t.prereg;

  const rawName = formData.get('donorName');
  const rawEmail = formData.get('donorEmail');
  const rawPhone = formData.get('donorPhone');

  const donorName = typeof rawName === 'string' ? rawName.trim() : '';
  if (donorName.length < 1) {
    return { status: 'error', message: tp.err_name_required };
  }

  const donorEmail =
    typeof rawEmail === 'string' && rawEmail.trim() !== ''
      ? rawEmail.trim()
      : undefined;
  const donorPhone =
    typeof rawPhone === 'string' && rawPhone.trim() !== ''
      ? rawPhone.trim()
      : undefined;
  if (donorEmail === undefined && donorPhone === undefined) {
    return { status: 'error', message: tp.err_contact_required };
  }

  const items = parseSupplyLines(formData.get('items'), {
    isValidCategory: isMaterialCategory,
    allowEmpty: true,
  });
  if (items === null) {
    return { status: 'error', message: tp.err_invalid_items };
  }
  if (items.length < 1) {
    return { status: 'error', message: tp.err_items_required };
  }

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/donation-intakes',
    {
      params: { path: { emergencyId } },
      body: {
        targetResourceId: resourceId,
        donorName,
        ...(donorEmail !== undefined ? { donorEmail } : {}),
        ...(donorPhone !== undefined ? { donorPhone } : {}),
        items,
      },
    },
  );

  if (response.status === 409) {
    return { status: 'error', message: tp.err_not_accepting };
  }
  if (response.status === 422) {
    return { status: 'error', message: tp.not_eligible_body };
  }
  if (response.status === 429) {
    return { status: 'error', message: tp.err_too_many };
  }
  if (error !== undefined || data === undefined) {
    return { status: 'error', message: tp.err_submit_failed };
  }

  return { status: 'success', id: data.id, code: data.intakeCode };
}
