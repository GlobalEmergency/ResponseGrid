'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@responsegrid/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';

type SupplyLineView = components['schemas']['SupplyLineResponseDto'];

export type InventoryState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string; invalidRow?: number };

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
    return redirectToLogin(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
  }
  // Not the owner/coordinator of this point → back to the caller's own list
  // (same pattern as the intake detail page), never a misleading 404.
  if (response.status === 403) {
    redirect(`/e/${slug}/mis-puntos`);
  }
  // 400 = malformed resourceId (ParseUUIDPipe): same user-facing 404 as unknown.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok || data == null) {
    // 5xx/unexpected: the point may exist — fail loudly instead of rendering
    // notFound() for a transient API error.
    throw new Error(`GET /resources/${resourceId}/inventory failed: ${response.status}`);
  }
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

  // Full taxonomy, NOT material-only: other intakes (API registration,
  // inventory entries) persist any `Category`, and a round-trip through this
  // form must never make such an inventory unsaveable.
  const validCategories = new Set(
    (await getCategories(locale)).map((c) => c.slug),
  );

  // allowEmpty: the owner can clear the inventory (empty list is a valid save).
  const parsedItems = parseSupplyLines(formData.get('items'), {
    isValidCategory: (c) => validCategories.has(c),
    allowEmpty: true,
  });
  if ('invalidRow' in parsedItems) {
    // invalidRow >= 0 means a specific row failed validation (#296): surface
    // its 1-based position and let the caller highlight that row instead of
    // making the owner hunt through a long inventory for the bad line.
    const { invalidRow } = parsedItems;
    return {
      status: 'error',
      message:
        invalidRow >= 0
          ? t.account.inventory_invalid_row.replace('{n}', String(invalidRow + 1))
          : t.account.inventory_invalid_items,
      ...(invalidRow >= 0 ? { invalidRow } : {}),
    };
  }
  const { items } = parsedItems;

  const { response } = await api.PUT('/resources/{resourceId}/inventory', {
    params: { path: { resourceId } },
    headers: authHeaders(token),
    body: { items },
  });

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
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
