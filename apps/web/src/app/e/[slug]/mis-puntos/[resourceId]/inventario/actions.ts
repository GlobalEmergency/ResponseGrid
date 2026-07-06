'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { parseSupplyLines } from '@/lib/supply-lines';
import { getT } from '@/i18n/server';
import { getCategories } from '@/adapters/get-categories';

type InventoryView = components['schemas']['InventoryViewDto'];

export type InventoryState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Owner/coordinator read of the point's full declared lines (null →
 * notFound). Includes the optimistic-concurrency `version` (#294): the form
 * carries it back as `expectedVersion` on save, so a concurrent merge
 * (inventory-entries, a donation) is detected instead of silently overwritten.
 */
export async function fetchMyInventory(
  resourceId: string,
  slug: string,
): Promise<InventoryView | null> {
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
  const items = parseSupplyLines(formData.get('items'), {
    isValidCategory: (c) => validCategories.has(c),
    allowEmpty: true,
  });
  if (items === null) {
    return { status: 'error', message: t.account.inventory_invalid_items };
  }

  // Optimistic-concurrency guard (#294): the hidden field carries the version
  // read on page load. A missing/non-numeric value is treated as "definitely
  // stale" (0 never matches a resource whose inventory has been touched more
  // than once) so the API rejects it with 409 rather than the write silently
  // going through with an undefined expectedVersion.
  const expectedVersion = Number(formData.get('expectedVersion') ?? NaN);

  const { response } = await api.PUT('/resources/{resourceId}/inventory', {
    params: { path: { resourceId } },
    headers: authHeaders(token),
    body: { items, expectedVersion: Number.isFinite(expectedVersion) ? expectedVersion : 0 },
  });

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
  }
  if (response.status === 403) {
    return { status: 'error', message: t.account.inventory_update_forbidden };
  }
  if (response.status === 409) {
    // Someone else (an inventory entry, a donation) changed the inventory
    // since this form was loaded — revalidate so a page reload shows the
    // fresh state, and tell the owner to reload instead of silently
    // overwriting the concurrent change (#294).
    revalidatePath(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
    return { status: 'error', message: t.account.inventory_update_conflict };
  }
  if (!response.ok) {
    return { status: 'error', message: t.account.inventory_update_failed };
  }

  revalidatePath(`/e/${slug}/mis-puntos`);
  revalidatePath(`/e/${slug}/mis-puntos/${resourceId}/inventario`);
  return { status: 'success' };
}
