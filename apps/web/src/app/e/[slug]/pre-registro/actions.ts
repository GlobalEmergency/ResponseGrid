'use server';

import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import { getToken, authHeaders } from '@/lib/auth';
import { getMe } from '@/lib/navigation-data';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getCategories } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';

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
  const { t, locale } = await getT();
  const tp = t.prereg;

  const rawName = formData.get('donorName');
  const rawEmail = formData.get('donorEmail');
  const rawPhone = formData.get('donorPhone');
  const formPhone = typeof rawPhone === 'string' ? rawPhone.trim() : '';

  // When the donor is logged in, their contact is taken authoritatively from
  // their account (name/email always; phone from the profile, falling back to a
  // phone typed here when the profile has none). Anonymous donors type it all.
  const me = await getMe();

  let donorName: string;
  let donorEmail: string | undefined;
  let donorPhone: string | undefined;

  if (me) {
    donorName = me.name;
    donorEmail = me.email;
    donorPhone =
      me.phone != null && me.phone !== ''
        ? me.phone
        : formPhone !== ''
          ? formPhone
          : undefined;
  } else {
    donorName = typeof rawName === 'string' ? rawName.trim() : '';
    if (donorName.length < 1) {
      return { status: 'error', message: tp.err_name_required };
    }
    donorEmail =
      typeof rawEmail === 'string' && rawEmail.trim() !== ''
        ? rawEmail.trim()
        : undefined;
    donorPhone = formPhone !== '' ? formPhone : undefined;
    if (donorEmail === undefined && donorPhone === undefined) {
      return { status: 'error', message: tp.err_contact_required };
    }
  }

  const validMaterialCategories = new Set(
    (await getCategories(locale)).filter(isMaterialCategory).map((c) => c.slug),
  );

  const items = parseSupplyLines(formData.get('items'), {
    isValidCategory: (c) => validMaterialCategories.has(c),
    allowEmpty: true,
  });
  if (items === null) {
    return { status: 'error', message: tp.err_invalid_items };
  }
  if (items.length < 1) {
    return { status: 'error', message: tp.err_items_required };
  }

  // Forward the session cookie if the donor is logged in: the endpoint uses an
  // optional-JWT guard, so this links the intake to their user (donorUserId) and
  // makes it show up under "Mis donaciones" — anonymous pre-registration still
  // works (no token → no link, only the code/QR).
  const token = await getToken();

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/donation-intakes',
    {
      params: { path: { emergencyId } },
      ...(token !== null ? { headers: authHeaders(token) } : {}),
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
