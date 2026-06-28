import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';
import type { components } from '@reliefhub/api-client';
import { ShipmentsList } from '@/components/organisms/shipments-list';
import { CapacitiesPanel } from '@/components/organisms/capacities-panel';
import { ShipmentsFilter } from '@/components/molecules/shipments-filter';
import { CapacitiesFilter } from '@/components/molecules/capacities-filter';
import { CreateShipment } from './create-shipment';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type ShipmentStatus = components['schemas']['ShipmentViewDto']['status'];
type CapacityMode = components['schemas']['CapacityViewDto']['mode'];
type CapacityStatus = components['schemas']['CapacityViewDto']['status'];

const VALID_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'planned',
  'assigned',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
];
const VALID_CAP_MODES: CapacityMode[] = ['road', 'sea', 'air'];
const VALID_CAP_STATUSES: CapacityStatus[] = [
  'available',
  'reserved',
  'withdrawn',
];

// Resources usable as shipment origin/destination — collection/warehouse nodes.
const RESOURCE_PAGE_SIZE = 100;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) return { title: t.coord.meta_not_found };
  return {
    title: t.coord.shipments_section_meta_title.replace('{name}', emergency.name),
    description: t.coord.shipments_section_meta_description.replace(
      '{name}',
      emergency.name,
    ),
  };
}

export default async function CoordinacionExpedicionesPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const headers = authHeaders(token);

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergencyId,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  // Permission gate: a principal without shipment:read is bounced to the hub.
  if (!access.canCoordinateLogistics) {
    redirect(`/e/${slug}/coordinacion`);
  }

  const canCreate = access.permissions.has('shipment:create');

  // --- Parse filter params ----------------------------------------------
  const rawStatus =
    typeof resolvedSearchParams.status === 'string'
      ? resolvedSearchParams.status
      : undefined;
  const status = VALID_SHIPMENT_STATUSES.includes(rawStatus as ShipmentStatus)
    ? (rawStatus as ShipmentStatus)
    : undefined;

  const rawCapMode =
    typeof resolvedSearchParams.capMode === 'string'
      ? resolvedSearchParams.capMode
      : undefined;
  const capMode = VALID_CAP_MODES.includes(rawCapMode as CapacityMode)
    ? (rawCapMode as CapacityMode)
    : undefined;

  const rawCapStatus =
    typeof resolvedSearchParams.capStatus === 'string'
      ? resolvedSearchParams.capStatus
      : undefined;
  const capStatus = VALID_CAP_STATUSES.includes(rawCapStatus as CapacityStatus)
    ? (rawCapStatus as CapacityStatus)
    : undefined;

  const { t } = await getT();
  const tc = t.coord;

  const onUnauthorized = async (statusCode: number): Promise<void> => {
    if (statusCode === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion/expediciones`);
    }
  };

  // --- Fetch shipments + capacities + resources (for names/selects) -----
  const [shipments, capacities, resourcesPage] = await Promise.all([
    api
      .GET('/emergencies/{emergencyId}/logistics/shipments', {
        params: {
          path: { emergencyId },
          query: { ...(status !== undefined && { status }) },
        },
        headers,
      })
      .then(async (r) => {
        await onUnauthorized(r.response.status);
        if (r.response.status === 403) redirect(`/e/${slug}/coordinacion`);
        return r.data ?? [];
      }),
    api
      .GET('/emergencies/{emergencyId}/logistics/capacities', {
        params: {
          path: { emergencyId },
          query: {
            ...(capMode !== undefined && { mode: capMode }),
            ...(capStatus !== undefined && { status: capStatus }),
          },
        },
        headers,
      })
      .then(async (r) => {
        await onUnauthorized(r.response.status);
        return r.data ?? [];
      }),
    // ponytail: origen/destino se eligen de un <select> poblado con la lista
    // pública de recursos (sin map-resource-picker). Tomamos la primera página
    // (límite 100); paginación de recursos en el selector queda fuera de v1.
    api
      .GET('/emergencies/{emergencyId}/public/resources', {
        params: {
          path: { emergencyId },
          query: { page: 1, limit: RESOURCE_PAGE_SIZE },
        },
      })
      .then((r) => r.data?.items ?? []),
  ]);

  const resourceNames: Record<string, string> = {};
  for (const r of resourcesPage) resourceNames[r.id] = r.name;
  const resourceOptions = resourcesPage.map((r) => ({ id: r.id, name: r.name }));

  // Available capacities the coordinator can assign from a shipment drawer.
  const assignableCapacities = capacities.filter((c) => c.status === 'available');

  const isShipmentsFiltered = status !== undefined;

  return (
    <section aria-labelledby="shipments-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="shipments-heading" className="text-xl font-bold text-ink">
            {tc.shipments_heading}
          </h2>
          {canCreate && (
            <CreateShipment
              emergencyId={emergencyId}
              slug={slug}
              resources={resourceOptions}
            />
          )}
        </div>

        <ShipmentsFilter />

        <ShipmentsList
          shipments={shipments}
          slug={slug}
          resourceNames={resourceNames}
          capacities={assignableCapacities}
          canManage
          listLabel={tc.shipments_list_label}
          emptyTitle={
            isShipmentsFiltered
              ? tc.shipments_no_match_title
              : tc.shipments_empty_title
          }
          emptyDescription={
            isShipmentsFiltered
              ? tc.shipments_no_match_description
              : tc.shipments_empty_description
          }
        />
      </div>

      {/* ── Capacidades disponibles (read-only, #105) ──────────────────── */}
      <div className="flex flex-col gap-5 border-t border-line pt-6">
        <h2 className="text-xl font-bold text-ink">{tc.cap_heading}</h2>
        <p className="text-sm text-muted">{tc.cap_subtitle}</p>

        <CapacitiesFilter />

        <CapacitiesPanel
          capacities={capacities}
          tc={tc}
          listLabel={tc.cap_list_label}
          emptyTitle={tc.cap_empty_title}
          emptyDescription={tc.cap_empty_description}
        />
      </div>
    </section>
  );
}
