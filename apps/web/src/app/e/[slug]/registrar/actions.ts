'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { parseSupplyLines } from '@/lib/supply-lines';
import { localizeBackendError } from '@/lib/backend-error-messages';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';

type ResourceType = components['schemas']['RegisterResourceDto']['type'];

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_TYPES: ResourceType[] = [
  'collection_point',
  'delivery_point',
  'collection_and_delivery',
  'warehouse',
  'transport',
  'supplier',
  'venue',
];

function isResourceType(value: unknown): value is ResourceType {
  return VALID_TYPES.includes(value as ResourceType);
}

export async function registerResource(
  slug: string,
  emergencyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = await requireSession(`/e/${slug}/registrar`);

  const { t, locale } = await getT();

  const rawType = formData.get('type');
  const rawName = formData.get('name');
  const rawDescription = formData.get('description');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');
  const rawOrgId = formData.get('organizationId');

  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!isResourceType(rawType)) {
    return { status: 'error', message: t.registrar.err_invalid_type };
  }
  if (name.length < 2) {
    return { status: 'error', message: t.registrar.err_name_too_short };
  }

  const latStr = typeof rawLatitude === 'string' ? rawLatitude.trim() : '';
  const lonStr = typeof rawLongitude === 'string' ? rawLongitude.trim() : '';

  if (latStr === '' || lonStr === '') {
    return { status: 'error', message: t.registrar.err_location_required };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : t.common.default_address;
  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  const description =
    typeof rawDescription === 'string' && rawDescription.trim() !== ''
      ? rawDescription.trim()
      : undefined;

  const ownerOrganizationId =
    typeof rawOrgId === 'string' && rawOrgId.trim() !== ''
      ? rawOrgId.trim()
      : undefined;

  const validMaterialCategories = new Set(
    (await getCategories(locale)).filter(isMaterialCategory).map((c) => c.slug),
  );

  const parsedItems = parseSupplyLines(formData.get('items'), {
    isValidCategory: (c) => validMaterialCategories.has(c),
    allowEmpty: true,
  });
  if ('invalidRow' in parsedItems) {
    return { status: 'error', message: t.registrar.err_invalid_items };
  }
  const { items } = parsedItems;

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/resources',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        type: rawType,
        name,
        ...(description !== undefined ? { description } : {}),
        location: { address, latitude, longitude },
        ...(ownerOrganizationId !== undefined ? { ownerOrganizationId } : {}),
        ...(items.length > 0 ? { items } : {}),
      },
    },
  );

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/registrar`);
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
      message: localizeBackendError(
        t.backendErrors,
        rawMessage,
        t.registrar.err_register_failed,
      ),
    };
  }

  return { status: 'success', id: data.id };
}
