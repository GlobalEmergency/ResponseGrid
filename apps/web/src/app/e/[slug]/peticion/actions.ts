'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders } from '@/lib/auth';

type NeedCategory = components['schemas']['NeedItemDto']['category'];
type NeedPriority = components['schemas']['CreateNeedDto']['priority'];
type NeedItem = components['schemas']['NeedItemDto'];

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

interface RawItem {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  category?: unknown;
}

function parseItems(raw: string): NeedItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const items: NeedItem[] = [];
  for (const entry of parsed as RawItem[]) {
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const quantity =
      typeof entry.quantity === 'number' && entry.quantity > 0
        ? entry.quantity
        : 0;
    const unit =
      typeof entry.unit === 'string' && entry.unit.trim() !== ''
        ? entry.unit.trim()
        : undefined;
    const category = entry.category;

    if (name === '') return null;
    if (quantity <= 0) return null;
    if (!isCategory(category)) return null;

    items.push({
      name,
      quantity,
      category,
      ...(unit !== undefined ? { unit } : {}),
    });
  }

  return items.length > 0 ? items : null;
}

export async function submitPeticion(
  emergencyId: string,
  _prev: PeticionState,
  formData: FormData,
): Promise<PeticionState> {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }

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
    return { status: 'error', message: 'El título debe tener al menos 2 caracteres.' };
  }
  if (!isPriority(rawPriority)) {
    return { status: 'error', message: 'Prioridad no válida.' };
  }

  const latStr = typeof rawLatitude === 'string' ? rawLatitude.trim() : '';
  const lonStr = typeof rawLongitude === 'string' ? rawLongitude.trim() : '';

  if (latStr === '' || lonStr === '') {
    return { status: 'error', message: 'Selecciona una ubicación.' };
  }

  const address =
    typeof rawAddress === 'string' && rawAddress.trim() !== ''
      ? rawAddress.trim()
      : 'Sin dirección';
  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  if (typeof rawItems !== 'string' || rawItems.trim() === '') {
    return { status: 'error', message: 'Añade al menos un artículo.' };
  }

  const items = parseItems(rawItems);
  if (items === null) {
    return {
      status: 'error',
      message: 'Revisa los artículos: cada uno necesita nombre, cantidad y categoría.',
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
    redirect('/login');
  }

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
