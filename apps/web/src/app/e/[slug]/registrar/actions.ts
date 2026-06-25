'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders } from '@/lib/auth';

type ResourceType = components['schemas']['RegisterResourceDto']['type'];
type Stage = components['schemas']['RegisterResourceDto']['stage'];

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
  const rawType = formData.get('type');
  const rawStage = formData.get('stage');
  const rawName = formData.get('name');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');

  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!isResourceType(rawType)) {
    return { status: 'error', message: 'Tipo de recurso no válido.' };
  }
  if (!isStage(rawStage)) {
    return { status: 'error', message: 'Etapa no válida.' };
  }
  if (name.length < 2) {
    return { status: 'error', message: 'El nombre debe tener al menos 2 caracteres.' };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : 'Sin dirección';
  const latitude =
    typeof rawLatitude === 'string' && rawLatitude !== ''
      ? Number(rawLatitude)
      : 0;
  const longitude =
    typeof rawLongitude === 'string' && rawLongitude !== ''
      ? Number(rawLongitude)
      : 0;

  const token = await getToken();
  const headers = token ? authHeaders(token) : {};

  const { data, error } = await api.POST(
    '/emergencies/{emergencyId}/resources',
    {
      params: { path: { emergencyId } },
      headers,
      body: {
        type: rawType,
        stage: rawStage,
        name,
        location: { address, latitude, longitude },
      },
    },
  );

  if (error !== undefined || data === undefined) {
    const msg =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Error al registrar. Inténtalo de nuevo.';
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}
