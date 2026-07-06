'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { parseSupplyLines } from '@/lib/supply-lines';
import { localizeBackendError } from '@/lib/backend-error-messages';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';

type NeedPriority = components['schemas']['CreateNeedDto']['priority'];

export type PeticionState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_PRIORITIES: NeedPriority[] = ['low', 'medium', 'high', 'urgent'];

function isPriority(value: unknown): value is NeedPriority {
  return VALID_PRIORITIES.includes(value as NeedPriority);
}

export async function submitPeticion(
  slug: string,
  emergencyId: string,
  _prev: PeticionState,
  formData: FormData,
): Promise<PeticionState> {
  // Optional link to the resource / final recipient this need belongs to (#60).
  // Parsed up front so the login round-trip on an expired session keeps it —
  // the API validates it is a real UUID; garbage is rejected server-side.
  const rawResourceId = formData.get('resourceId');
  const resourceId =
    typeof rawResourceId === 'string' && rawResourceId.trim() !== ''
      ? rawResourceId.trim()
      : undefined;
  const peticionPath =
    resourceId !== undefined
      ? `/e/${slug}/peticion?resourceId=${encodeURIComponent(resourceId)}`
      : `/e/${slug}/peticion`;

  const token = await requireSession(peticionPath);

  const { t, locale } = await getT();

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

  // Category validation is sourced from the DB (single source of truth), so
  // the server accepts exactly what the form offers (incl. clothing and
  // medical_personnel, which getCategories returns alongside material slugs).
  const validCategories = new Set((await getCategories(locale)).map((c) => c.slug));

  const parsedItems = parseSupplyLines(rawItems, {
    isValidCategory: (c) => validCategories.has(c),
    allowEmpty: false,
  });
  if ('invalidRow' in parsedItems) {
    return {
      status: 'error',
      message: t.peticion.err_invalid_items,
    };
  }
  const { items } = parsedItems;

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
        ...(resourceId !== undefined ? { resourceId } : {}),
        items,
      },
    },
  );

  if (response.status === 401) {
    return redirectToLogin(peticionPath);
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: t.common.intake_paused,
    };
  }

  if (error !== undefined || data === undefined) {
    const rawMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : undefined;
    return {
      status: 'error',
      message: localizeBackendError(t.backendErrors, rawMessage, t.peticion.err_submit_failed),
    };
  }

  return { status: 'success', id: data.id };
}
