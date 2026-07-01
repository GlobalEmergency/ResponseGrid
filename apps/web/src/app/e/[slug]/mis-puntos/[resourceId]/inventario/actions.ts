'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, loginHref, authHeaders, clearToken } from '@/lib/auth';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';
import { isMaterialCategory } from '@/domain/supplies/category';

type SupplyLineView = components['schemas']['SupplyLineResponseDto'];

export type InventoryState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/** Owner/coordinator read of the point's full declared lines (null → notFound). */
export async function fetchMyInventory(
  resourceId: string,
  slug: string,
): Promise<SupplyLineView[] | null> {
  const token = await requireSession(`/e/${slug}/mis-puntos/${resourceId}/inventario`);

  const { data, response } = await api.GET('/resources/{resourceId}/inventory', {
    params: { path: { resourceId } },
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    await clearToken();
    redirect(loginHref(`/e/${slug}/mis-puntos/${resourceId}/inventario`));
  }
  if (!response.ok || data == null) return null;
  return data;
}

export async function saveMyInventory(
  resourceId: string,
  slug: string,
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const token = await requireSession(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
  const { t, locale } = await getT();

  const validMaterialCategories = new Set(
    (await getCategories(locale)).filter(isMaterialCategory).map((c) => c.slug),
  );

  // allowEmpty: the owner can clear the inventory (empty list is a valid save).
  const items = parseSupplyLines(formData.get('items'), {
    isValidCategory: (c) => validMaterialCategories.has(c),
    allowEmpty: true,
  });
  if (items === null) {
    return { status: 'error', message: t.account.inventory_invalid_items };
  }

  const { response } = await api.PUT('/resources/{resourceId}/inventory', {
    params: { path: { resourceId } },
    headers: authHeaders(token),
    body: { items },
  });

  if (response.status === 401) {
    await clearToken();
    redirect(loginHref(`/e/${slug}/mis-puntos/${resourceId}/inventario`));
  }
  if (response.status === 403) {
    return { status: 'error', message: t.account.inventory_update_forbidden };
  }
  if (!response.ok) {
    return { status: 'error', message: t.account.inventory_update_failed };
  }

  revalidatePath(`/e/${slug}/mis-puntos`);
  revalidatePath(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
  return { status: 'success' };
}
