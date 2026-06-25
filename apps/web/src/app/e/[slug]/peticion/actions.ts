'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

type NeedCategory = components['schemas']['NeedItemDto']['category'];
type NeedPriority = components['schemas']['CreateNeedDto']['priority'];

export type PeticionState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_CATEGORIES: NeedCategory[] = [
  'hygiene',
  'water',
  'food',
  'medical',
  'shelter',
  'tools',
  'other',
];

const VALID_PRIORITIES: NeedPriority[] = ['low', 'medium', 'high', 'urgent'];

function isCategory(value: unknown): value is NeedCategory {
  return VALID_CATEGORIES.includes(value as NeedCategory);
}

function isPriority(value: unknown): value is NeedPriority {
  return VALID_PRIORITIES.includes(value as NeedPriority);
}

export async function submitPeticion(
  emergencyId: string,
  _prev: PeticionState,
  formData: FormData,
): Promise<PeticionState> {
  const rawTitle = formData.get('title');
  const rawCategory = formData.get('category');
  const rawPriority = formData.get('priority');
  const rawQuantity = formData.get('quantity');
  const rawUnit = formData.get('unit');
  const rawAddress = formData.get('address');
  const rawLatitude = formData.get('latitude');
  const rawLongitude = formData.get('longitude');

  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

  if (title.length < 2) {
    return { status: 'error', message: 'El título debe tener al menos 2 caracteres.' };
  }
  if (!isCategory(rawCategory)) {
    return { status: 'error', message: 'Categoría no válida.' };
  }
  if (!isPriority(rawPriority)) {
    return { status: 'error', message: 'Prioridad no válida.' };
  }

  const quantity =
    typeof rawQuantity === 'string' && rawQuantity.trim() !== ''
      ? Number(rawQuantity)
      : 1;

  const unit =
    typeof rawUnit === 'string' && rawUnit.trim() !== ''
      ? rawUnit.trim()
      : undefined;

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

  const { data, error } = await api.POST(
    '/emergencies/{emergencyId}/needs',
    {
      params: { path: { emergencyId } },
      body: {
        title,
        priority: rawPriority,
        location: { address, latitude, longitude },
        items: [
          {
            name: title,
            quantity,
            category: rawCategory,
            ...(unit !== undefined ? { unit } : {}),
          },
        ],
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
        : 'Error al enviar la petición. Inténtalo de nuevo.';
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}
