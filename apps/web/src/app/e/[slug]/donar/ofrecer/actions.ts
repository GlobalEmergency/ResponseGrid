'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders, clearToken } from '@/lib/auth';
import { getT } from '@/i18n/server';

type OfferCategory = components['schemas']['SubmitOfferDto']['category'];

export type OfferState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_CATEGORIES: OfferCategory[] = [
  'hygiene',
  'water',
  'food',
  'medical',
  'shelter',
  'tools',
  'other',
];

function isCategory(value: unknown): value is OfferCategory {
  return VALID_CATEGORIES.includes(value as OfferCategory);
}

export async function submitOffer(
  emergencyId: string,
  _prev: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }

  const { t } = await getT();

  const rawCategory = formData.get('category');
  const rawDescription = formData.get('description');
  const rawQuantity = formData.get('quantity');
  const rawUnit = formData.get('unit');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');
  const rawOrgId = formData.get('organizationId');
  const rawNotes = formData.get('notes');
  const rawTargetNeedId = formData.get('targetNeedId');

  if (!isCategory(rawCategory)) {
    return { status: 'error', message: t.donar.err_invalid_category };
  }

  const description =
    typeof rawDescription === 'string' ? rawDescription.trim() : '';
  if (description.length < 2) {
    return {
      status: 'error',
      message: t.donar.err_description_too_short,
    };
  }

  const quantityRaw =
    typeof rawQuantity === 'string' ? Number(rawQuantity) : NaN;
  if (!Number.isInteger(quantityRaw) || quantityRaw <= 0) {
    return { status: 'error', message: t.donar.err_invalid_quantity };
  }

  const latStr = typeof rawLatitude === 'string' ? rawLatitude.trim() : '';
  const lonStr = typeof rawLongitude === 'string' ? rawLongitude.trim() : '';

  if (latStr === '' || lonStr === '') {
    return { status: 'error', message: t.donar.err_location_required };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : t.common.default_address;
  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  const unit =
    typeof rawUnit === 'string' && rawUnit.trim() !== ''
      ? rawUnit.trim()
      : undefined;

  const notes =
    typeof rawNotes === 'string' && rawNotes.trim() !== ''
      ? rawNotes.trim()
      : undefined;

  const donorOrganizationId =
    typeof rawOrgId === 'string' && rawOrgId.trim() !== ''
      ? rawOrgId.trim()
      : undefined;

  const targetNeedId =
    typeof rawTargetNeedId === 'string' && rawTargetNeedId.trim() !== ''
      ? rawTargetNeedId.trim()
      : undefined;

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/offers',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        category: rawCategory,
        description,
        quantity: quantityRaw,
        ...(unit !== undefined ? { unit } : {}),
        location: { address, latitude, longitude },
        ...(targetNeedId !== undefined ? { targetNeedId } : {}),
        ...(donorOrganizationId !== undefined ? { donorOrganizationId } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    },
  );

  if (response.status === 401) {
    await clearToken();
    redirect('/login');
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
        : t.donar.err_submit_failed;
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}
