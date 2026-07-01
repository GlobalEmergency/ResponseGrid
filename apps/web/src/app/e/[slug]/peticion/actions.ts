'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders, clearToken } from '@/lib/auth';
import { ALL_CATEGORIES } from '@/lib/categories';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getT } from '@/i18n/server';

type Category = components['schemas']['SupplyLineDto']['category'];
type NeedPriority = components['schemas']['CreateNeedDto']['priority'];

export type PeticionState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_PRIORITIES: NeedPriority[] = ['low', 'medium', 'high', 'urgent'];

// Category validation uses the single canonical list (lib/categories), so the
// server accepts exactly what the form offers (incl. clothing).
function isCategory(value: unknown): value is Category {
  return (ALL_CATEGORIES as readonly string[]).includes(value as string);
}

function isPriority(value: unknown): value is NeedPriority {
  return VALID_PRIORITIES.includes(value as NeedPriority);
}

export async function submitPeticion(
  slug: string,
  emergencyId: string,
  _prev: PeticionState,
  formData: FormData,
): Promise<PeticionState> {
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/e/${slug}/peticion`);
  }

  const { t } = await getT();

  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const rawPriority = formData.get('priority');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');
  const rawOrgId = formData.get('organizationId');
  const rawItems = formData.get('items');

  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

  if (title.length < 2) {
    return { status: 'error', message: t.peticion.err_title_too_short };
  }
  if (!isPriority(rawPriority)) {
    return { status: 'error', message: t.peticion.err_invalid_priority };
  }

  const latStr = typeof rawLatitude === 'string' ? rawLatitude.trim() : '';
  const lonStr = typeof rawLongitude === 'string' ? rawLongitude.trim() : '';

  if (latStr === '' || lonStr === '') {
    return { status: 'error', message: t.peticion.err_location_required };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : t.common.default_address;
  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  if (typeof rawItems !== 'string' || rawItems.trim() === '') {
    return { status: 'error', message: t.peticion.err_items_required };
  }

  const items = parseSupplyLines(rawItems, {
    isValidCategory: isCategory,
    allowEmpty: false,
  });
  if (items === null) {
    return {
      status: 'error',
      message: t.peticion.err_invalid_items,
    };
  }

  const description =
    typeof rawDescription === 'string' && rawDescription.trim() !== ''
      ? rawDescription.trim()
      : undefined;

  const requesterOrganizationId =
    typeof rawOrgId === 'string' && rawOrgId.trim() !== ''
      ? rawOrgId.trim()
      : undefined;

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/needs',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        title,
        ...(description !== undefined ? { description } : {}),
        priority: rawPriority,
        location: { address, latitude, longitude },
        ...(requesterOrganizationId !== undefined ? { requesterOrganizationId } : {}),
        items,
      },
    },
  );

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/peticion`);
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: t.common.intake_paused,
    };
  }

  if (error !== undefined || data === undefined) {
    const msg =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : t.peticion.err_submit_failed;
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}
