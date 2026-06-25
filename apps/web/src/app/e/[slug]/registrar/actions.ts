'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

type ResourceType = components['schemas']['RegisterResourceDto']['type'];
type Side = components['schemas']['RegisterResourceDto']['side'];

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_TYPES: ResourceType[] = [
  'collection_point',
  'delivery_point',
  'warehouse',
  'transport',
  'supplier',
  'venue',
];

const VALID_SIDES: Side[] = ['origin', 'destination'];

function isResourceType(value: unknown): value is ResourceType {
  return VALID_TYPES.includes(value as ResourceType);
}

function isSide(value: unknown): value is Side {
  return VALID_SIDES.includes(value as Side);
}

export async function registerResource(
  emergencyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawType = formData.get('type');
  const rawSide = formData.get('side');
  const rawName = formData.get('name');

  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!isResourceType(rawType)) {
    return { status: 'error', message: 'Tipo de recurso no válido.' };
  }
  if (!isSide(rawSide)) {
    return { status: 'error', message: 'Lado no válido.' };
  }
  if (name.length < 2) {
    return { status: 'error', message: 'El nombre debe tener al menos 2 caracteres.' };
  }

  const { data, error } = await api.POST(
    '/emergencies/{emergencyId}/resources',
    {
      params: { path: { emergencyId } },
      body: { type: rawType, side: rawSide, name },
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
