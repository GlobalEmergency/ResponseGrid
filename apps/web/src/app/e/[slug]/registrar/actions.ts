'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders, clearToken } from '@/lib/auth';
import { MATERIAL_CATEGORIES } from '@/lib/categories';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getT } from '@/i18n/server';

type ResourceType = components['schemas']['RegisterResourceDto']['type'];
type Stage = components['schemas']['RegisterResourceDto']['stage'];

/** Narrow a free string to a known material category slug (single source). */
function isMaterialCategory(v: string): boolean {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(v);
}

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

const VALID_STAGES: Stage[] = ['origin', 'intermediate', 'destination'];

function isResourceType(value: unknown): value is ResourceType {
  return VALID_TYPES.includes(value as ResourceType);
}

function isStage(value: unknown): value is Stage {
  return VALID_STAGES.includes(value as Stage);
}

export async function registerResource(
  emergencyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }

  const { t } = await getT();

  const rawType = formData.get('type');
  const rawStage = formData.get('stage');
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
  if (!isStage(rawStage)) {
    return { status: 'error', message: t.registrar.err_invalid_stage };
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

  const items = parseSupplyLines(formData.get('items'), {
    isValidCategory: isMaterialCategory,
    allowEmpty: true,
  });
  if (items === null) {
    return { status: 'error', message: t.registrar.err_invalid_items };
  }

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/resources',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        type: rawType,
        stage: rawStage,
        name,
        ...(description !== undefined ? { description } : {}),
        location: { address, latitude, longitude },
        ...(ownerOrganizationId !== undefined ? { ownerOrganizationId } : {}),
        ...(items.length > 0 ? { items } : {}),
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
        : t.registrar.err_register_failed;
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}
