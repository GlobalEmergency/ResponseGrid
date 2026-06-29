'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

type ShipmentItemInput = components['schemas']['SupplyLineDto'];
type CapacityView = components['schemas']['CapacityViewDto'];

/** Result of fetching ranked capacity suggestions for a shipment (#107). */
export type SuggestionsResult =
  | { status: 'success'; capacities: CapacityView[] }
  | { status: 'error'; message: string };

/**
 * Creates a shipment / expedición for the given emergency (coordinator).
 * `emergencyId` is bound server-side in the page so it is never trusted from
 * the client form. Origin/destination are resource ids picked from a select.
 */
export async function createShipment(
  emergencyId: string,
  slug: string,
  input: {
    originResourceId: string;
    destinationResourceId: string;
    items: ShipmentItemInput[];
    manifest?: string;
  },
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const { t } = await getT();
  const ts = t.coord;

  if (input.originResourceId === '' || input.destinationResourceId === '') {
    return { status: 'error', message: ts.ship_err_endpoints_required };
  }
  if (input.originResourceId === input.destinationResourceId) {
    return { status: 'error', message: ts.ship_err_same_endpoint };
  }
  if (input.items.length === 0) {
    return { status: 'error', message: ts.ship_err_items_required };
  }

  const { error, response } = await api.POST('/logistics/shipments', {
    body: {
      emergencyId,
      originResourceId: input.originResourceId,
      destinationResourceId: input.destinationResourceId,
      items: input.items,
      ...(input.manifest !== undefined && input.manifest !== ''
        ? { manifest: input.manifest }
        : {}),
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_create };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.common.intake_paused };
    }
    return { status: 'error', message: ts.ship_err_create_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion/expediciones`);
  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Assigns a transport capacity to a planned shipment (coordinator).
 * #107 FE replaces the plain capacity select with ranked suggestions — here we
 * just earmark the chosen capacity; carrier assignment is left to the backend.
 */
export async function assignCapacity(
  shipmentId: string,
  capacityId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const { t } = await getT();
  const ts = t.coord;

  if (capacityId === '') {
    return { status: 'error', message: ts.ship_err_capacity_required };
  }

  const { error, response } = await api.POST(
    '/logistics/shipments/{id}/assign-capacity',
    {
      params: { path: { id: shipmentId } },
      body: { assignedCapacityId: capacityId },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_assign };
    }
    if (response.status === 404) {
      return { status: 'error', message: ts.ship_err_not_found };
    }
    if (response.status === 409) {
      return { status: 'error', message: ts.ship_err_not_planned };
    }
    return { status: 'error', message: ts.ship_err_assign_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion/expediciones`);
  return { status: 'success' };
}

/**
 * Fetches ranked compatible capacities for a planned shipment (coordinator, #107).
 * The API returns them already ordered best-first — we DON'T re-sort. Runs as a
 * server action so the auth token (httpOnly cookie) never reaches the client.
 */
export async function getCapacitySuggestions(
  shipmentId: string,
  slug: string,
): Promise<SuggestionsResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const { t } = await getT();
  const ts = t.coord;

  const { data, error, response } = await api.GET(
    '/logistics/shipments/{id}/capacity-suggestions',
    {
      params: { path: { id: shipmentId } },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined || data === undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_assign };
    }
    if (response.status === 404) {
      return { status: 'error', message: ts.ship_err_not_found };
    }
    return { status: 'error', message: ts.ship_suggestions_error };
  }

  return { status: 'success', capacities: data };
}

/**
 * Marks an assigned shipment as in transit (assigned carrier or coordinator).
 */
export async function markInTransit(
  shipmentId: string,
  slug: string,
  /** Where to bounce on 401 — defaults to the coordinator panel. */
  loginNext = `/e/${slug}/coordinacion/expediciones`,
  /** Path to revalidate after the transition. */
  revalidate = `/e/${slug}/coordinacion/expediciones`,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=${loginNext}`);
  }

  const { t } = await getT();
  const ts = t.coord;

  const { error, response } = await api.POST(
    '/logistics/shipments/{id}/in-transit',
    {
      params: { path: { id: shipmentId } },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=${loginNext}`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_act };
    }
    if (response.status === 404) {
      return { status: 'error', message: ts.ship_err_not_found };
    }
    if (response.status === 409) {
      return { status: 'error', message: ts.ship_err_not_assigned };
    }
    return { status: 'error', message: ts.ship_err_transit_failed };
  }

  revalidatePath(revalidate);
  return { status: 'success' };
}

/**
 * Confirms a shipment delivery (assigned carrier or coordinator).
 */
export async function confirmDelivery(
  shipmentId: string,
  slug: string,
  loginNext = `/e/${slug}/coordinacion/expediciones`,
  revalidate = `/e/${slug}/coordinacion/expediciones`,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=${loginNext}`);
  }

  const { t } = await getT();
  const ts = t.coord;

  const { error, response } = await api.POST(
    '/logistics/shipments/{id}/deliver',
    {
      params: { path: { id: shipmentId } },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=${loginNext}`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_act };
    }
    if (response.status === 404) {
      return { status: 'error', message: ts.ship_err_not_found };
    }
    if (response.status === 409) {
      return { status: 'error', message: ts.ship_err_not_in_transit };
    }
    return { status: 'error', message: ts.ship_err_deliver_failed };
  }

  revalidatePath(revalidate);
  return { status: 'success' };
}

/**
 * Cancels a planned/assigned shipment (coordinator).
 */
export async function cancelShipment(
  shipmentId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const { t } = await getT();
  const ts = t.coord;

  const { error, response } = await api.POST(
    '/logistics/shipments/{id}/cancel',
    {
      params: { path: { id: shipmentId } },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
    }
    if (response.status === 403) {
      return { status: 'error', message: ts.ship_err_no_permission_cancel };
    }
    if (response.status === 404) {
      return { status: 'error', message: ts.ship_err_not_found };
    }
    if (response.status === 409) {
      return { status: 'error', message: ts.ship_err_cannot_cancel };
    }
    return { status: 'error', message: ts.ship_err_cancel_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion/expediciones`);
  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}
