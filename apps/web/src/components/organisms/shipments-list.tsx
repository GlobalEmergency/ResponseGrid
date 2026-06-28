'use client';

/**
 * Clickable shipments / expediciones list. Each row is a full-surface tap
 * target (≥44px, no hover-only affordances) that opens the mobile-first
 * {@link ShipmentDetail} drawer with the shipment's full detail + the lifecycle
 * actions allowed in its current status.
 *
 * Unlike the offers/needs queues, a shipment is NOT removed when acted on — its
 * lifecycle has several steps (planned → assigned → in_transit → delivered), so
 * after a successful transition we close the drawer and refresh the route (the
 * server action has already revalidated) to reflect the new status server-side.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { components } from '@reliefhub/api-client';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';
import { ShipmentDetail } from '@/components/organisms/shipment-detail';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type ShipmentView = components['schemas']['ShipmentViewDto'];
type CapacityView = components['schemas']['CapacityViewDto'];
type ShipmentStatus = ShipmentView['status'];

const SUMMARY_CARD_CLASS =
  'flex w-full flex-col gap-2 rounded-lg border-2 border-navy bg-white p-5 text-left transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2';

const META_ROW_CLASS =
  'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted';

const STATUS_BADGE: Record<
  ShipmentStatus,
  | 'offer-open'
  | 'offer-matched'
  | 'offer-fulfilled'
  | 'offer-cancelled'
  | 'role-member'
> = {
  planned: 'offer-open',
  assigned: 'offer-matched',
  in_transit: 'role-member',
  delivered: 'offer-fulfilled',
  failed: 'offer-cancelled',
  cancelled: 'offer-cancelled',
};

interface ShipmentsListProps {
  shipments: ShipmentView[];
  slug: string;
  /** id → resource name resolver (origin/destination). */
  resourceNames: Record<string, string>;
  /** Capacities available to assign (coordinator). Empty for carriers. */
  capacities: CapacityView[];
  /** Coordinator (can assign/cancel) vs carrier (transit/deliver only). */
  canManage: boolean;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function ShipmentsList({
  shipments,
  slug,
  resourceNames,
  capacities,
  canManage,
  listLabel,
  emptyTitle,
  emptyDescription,
}: ShipmentsListProps) {
  const tc = getMessages(useLocale()).coord;
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const STATUS_LABELS: Record<ShipmentStatus, string> = {
    planned: tc.ship_status_planned,
    assigned: tc.ship_status_assigned,
    in_transit: tc.ship_status_in_transit,
    delivered: tc.ship_status_delivered,
    failed: tc.ship_status_failed,
    cancelled: tc.ship_status_cancelled,
  };

  const resourceName = (id: string): string => resourceNames[id] ?? id;

  if (shipments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-4" aria-label={listLabel}>
        {shipments.map((shipment) => {
          const route = tc.ship_route
            .replace('{origin}', resourceName(shipment.originResourceId))
            .replace('{destination}', resourceName(shipment.destinationResourceId));
          const firstItem = shipment.items[0];
          return (
            <li key={shipment.id}>
              <button
                type="button"
                onClick={() => setOpenId(shipment.id)}
                className={SUMMARY_CARD_CLASS}
                aria-label={tc.ship_drawer_open.replace('{route}', route)}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span className="text-base font-bold leading-tight text-ink break-words">
                    {route}
                  </span>
                  <Badge variant={STATUS_BADGE[shipment.status]}>
                    {STATUS_LABELS[shipment.status]}
                  </Badge>
                </div>
                <div className={META_ROW_CLASS}>
                  {firstItem !== undefined && (
                    <span className="font-medium break-words">
                      {firstItem.description}
                      {shipment.items.length > 1
                        ? ` +${shipment.items.length - 1}`
                        : ''}
                    </span>
                  )}
                  <span aria-hidden="true" className="text-muted-soft">
                    →
                  </span>
                  <span className="font-semibold text-navy">
                    {tc.queue_view_detail}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {shipments.map((shipment) =>
        openId === shipment.id ? (
          <ShipmentDetail
            key={`drawer-${shipment.id}`}
            shipment={shipment}
            slug={slug}
            resourceName={resourceName}
            capacities={capacities}
            canManage={canManage}
            open
            onClose={() => setOpenId(null)}
            onActionSuccess={() => {
              setOpenId(null);
              router.refresh();
            }}
          />
        ) : null,
      )}
    </>
  );
}
