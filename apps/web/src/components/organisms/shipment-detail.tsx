'use client';

import { useActionState, useState, useEffect } from 'react';
import {
  assignCapacity,
  markInTransit,
  confirmDelivery,
  cancelShipment,
  type ActionResult,
} from '@/app/e/[slug]/coordinacion/expediciones/actions';
import type { components } from '@reliefhub/api-client';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { DetailField, DetailSection } from '@/components/molecules/detail-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type ShipmentViewDto = components['schemas']['ShipmentViewDto'];
type CapacityViewDto = components['schemas']['CapacityViewDto'];
type ShipmentStatus = ShipmentViewDto['status'];

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

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface ShipmentDetailProps {
  shipment: ShipmentViewDto;
  slug: string;
  /** Resolve a resource id to its display name (origin/destination). */
  resourceName: (id: string) => string;
  /** Available capacities to assign (for planned shipments). Empty for carriers. */
  capacities: CapacityViewDto[];
  /** Whether the user may assign/cancel (coordinator). Carriers pass false. */
  canManage: boolean;
  open: boolean;
  onClose: () => void;
  onActionSuccess: () => void;
}

export function ShipmentDetail({
  shipment,
  slug,
  resourceName,
  capacities,
  canManage,
  open,
  onClose,
  onActionSuccess,
}: ShipmentDetailProps) {
  const tc = getMessages(useLocale()).coord;

  const STATUS_LABELS: Record<ShipmentStatus, string> = {
    planned: tc.ship_status_planned,
    assigned: tc.ship_status_assigned,
    in_transit: tc.ship_status_in_transit,
    delivered: tc.ship_status_delivered,
    failed: tc.ship_status_failed,
    cancelled: tc.ship_status_cancelled,
  };

  const CARRIER_LABELS: Record<'volunteer' | 'organization', string> = {
    volunteer: tc.ship_carrier_volunteer,
    organization: tc.ship_carrier_organization,
  };

  const [selectedCapacityId, setSelectedCapacityId] = useState('');

  // Carriers act from /mis-expediciones; coordinators from the panel. The path
  // only steers the 401-redirect + revalidate target — both views also call
  // router.refresh() on success, so the visible list updates either way.
  const carrierBase = `/e/${slug}/mis-expediciones`;
  const coordBase = `/e/${slug}/coordinacion/expediciones`;
  const actorPath = canManage ? coordBase : carrierBase;

  const [assignState, assignFormAction, assignPending] = useActionState<
    ActionResult,
    FormData
  >(
    async () => assignCapacity(shipment.id, selectedCapacityId, slug),
    INITIAL_STATE,
  );

  const [transitState, transitFormAction, transitPending] = useActionState<
    ActionResult,
    FormData
  >(
    async () => markInTransit(shipment.id, slug, actorPath, actorPath),
    INITIAL_STATE,
  );

  const [deliverState, deliverFormAction, deliverPending] = useActionState<
    ActionResult,
    FormData
  >(
    async () => confirmDelivery(shipment.id, slug, actorPath, actorPath),
    INITIAL_STATE,
  );

  const [cancelState, cancelFormAction, cancelPending] = useActionState<
    ActionResult,
    FormData
  >(async () => cancelShipment(shipment.id, slug), INITIAL_STATE);

  // Any successful transition mutates the shipment — refresh the list/drawer.
  useEffect(() => {
    if (
      assignState.status === 'success' ||
      transitState.status === 'success' ||
      deliverState.status === 'success' ||
      cancelState.status === 'success'
    ) {
      onActionSuccess();
    }
  }, [
    assignState.status,
    transitState.status,
    deliverState.status,
    cancelState.status,
    onActionSuccess,
  ]);

  const errorMessage =
    (assignState.status === 'error' ? assignState.message : undefined) ??
    (transitState.status === 'error' ? transitState.message : undefined) ??
    (deliverState.status === 'error' ? deliverState.message : undefined) ??
    (cancelState.status === 'error' ? cancelState.message : undefined);

  const availableCapacities = capacities.filter(
    (c) => c.status === 'available',
  );

  // Lifecycle actions by status. Coordinators (canManage) get the full set;
  // carriers only get the in-transit / deliver transitions on their own legs.
  const canCancel =
    canManage &&
    (shipment.status === 'planned' || shipment.status === 'assigned');

  const actions = (
    <div className="flex flex-col gap-3">
      {canManage && shipment.status === 'planned' && (
        // ponytail: select plano de capacidades — #107 lo sustituye por
        // sugerencias rankeadas; aquí NO construimos el ranking.
        <form action={assignFormAction} className="flex flex-col gap-2">
          <Select
            id={`capacity-select-${shipment.id}`}
            name="capacityId"
            aria-label={tc.ship_assign_select_label}
            value={selectedCapacityId}
            onChange={(e) => setSelectedCapacityId(e.target.value)}
          >
            <option value="" disabled>
              {availableCapacities.length > 0
                ? tc.ship_assign_placeholder
                : tc.ship_assign_none}
            </option>
            {availableCapacities.map((c) => (
              <option key={c.id} value={c.id}>
                {capacityLabel(c, tc)}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            disabled={assignPending || selectedCapacityId === ''}
            fullWidth
            size="lg"
          >
            {assignPending ? tc.processing : tc.ship_assign_cta}
          </Button>
        </form>
      )}

      {shipment.status === 'assigned' && (
        <form action={transitFormAction}>
          <Button type="submit" disabled={transitPending} fullWidth size="lg">
            {transitPending ? tc.processing : tc.ship_mark_in_transit}
          </Button>
        </form>
      )}

      {shipment.status === 'in_transit' && (
        <form action={deliverFormAction}>
          <Button type="submit" disabled={deliverPending} fullWidth size="lg">
            {deliverPending ? tc.processing : tc.ship_confirm_delivery}
          </Button>
        </form>
      )}

      {canCancel && (
        <form action={cancelFormAction}>
          <Button
            type="submit"
            disabled={cancelPending}
            fullWidth
            size="lg"
            variant="danger-outline"
          >
            {cancelPending ? tc.cancelling : tc.ship_cancel}
          </Button>
        </form>
      )}
    </div>
  );

  const hasActions =
    (canManage && shipment.status === 'planned') ||
    shipment.status === 'assigned' ||
    shipment.status === 'in_transit' ||
    canCancel;

  const footer =
    hasActions || errorMessage !== undefined ? (
      <div className="flex flex-col gap-3">
        {errorMessage !== undefined && <ErrorMessage message={errorMessage} />}
        {hasActions && actions}
      </div>
    ) : undefined;

  const originName = resourceName(shipment.originResourceId);
  const destinationName = resourceName(shipment.destinationResourceId);
  const title = tc.ship_route.replace('{origin}', originName).replace(
    '{destination}',
    destinationName,
  );

  const carrier =
    shipment.carrierType != null && shipment.carrierId != null
      ? `${CARRIER_LABELS[shipment.carrierType]} · ${shipment.carrierId}`
      : null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={title}
      ariaLabel={tc.ship_drawer_open.replace('{route}', title)}
      titleAdornment={
        <Badge variant={STATUS_BADGE[shipment.status]}>
          {STATUS_LABELS[shipment.status]}
        </Badge>
      }
      footer={footer}
    >
      <DetailSection title={tc.ship_section_route}>
        <DetailField label={tc.ship_field_origin} value={originName} />
        <DetailField
          label={tc.ship_field_destination}
          value={destinationName}
        />
        <DetailField
          label={tc.detail_field_status}
          value={STATUS_LABELS[shipment.status]}
        />
      </DetailSection>

      <DetailSection title={tc.ship_section_items}>
        {shipment.items.length === 0 ? (
          <DetailField label={tc.ship_field_items} value={tc.detail_value_none} />
        ) : (
          <ul className="flex flex-col gap-1 py-2 text-sm text-ink">
            {shipment.items.map((item, idx) => (
              <li key={idx} className="break-words">
                {formatItem(item)}
              </li>
            ))}
          </ul>
        )}
        <DetailField label={tc.ship_field_manifest} value={shipment.manifest} />
      </DetailSection>

      <DetailSection title={tc.ship_section_assignment}>
        <DetailField
          label={tc.ship_field_capacity}
          value={shipment.assignedCapacityId}
        />
        <DetailField label={tc.ship_field_carrier} value={carrier} />
      </DetailSection>
    </DetailDrawer>
  );
}

type Tc = ReturnType<typeof getMessages>['coord'];

function formatItem(item: components['schemas']['ShipmentItemResponseDto']): string {
  const qty =
    typeof item.quantity === 'number' && Number.isFinite(item.quantity)
      ? `${item.quantity}${typeof item.unit === 'string' && item.unit !== '' ? ` ${item.unit}` : ''}`
      : '';
  return qty !== '' ? `${item.description} · ${qty}` : item.description;
}

/** Short label for a capacity option: mode + weight/volume. */
function capacityLabel(c: components['schemas']['CapacityViewDto'], tc: Tc): string {
  const MODE_LABELS: Record<'road' | 'sea' | 'air', string> = {
    road: tc.ship_mode_road,
    sea: tc.ship_mode_sea,
    air: tc.ship_mode_air,
  };
  const parts: string[] = [MODE_LABELS[c.mode]];
  if (typeof c.capacity.weightKg === 'number') {
    parts.push(`${c.capacity.weightKg} kg`);
  }
  if (typeof c.capacity.volumeM3 === 'number') {
    parts.push(`${c.capacity.volumeM3} m³`);
  }
  const area =
    typeof c.coverage.area === 'string' && c.coverage.area !== ''
      ? c.coverage.area
      : '';
  return area !== '' ? `${parts.join(' · ')} — ${area}` : parts.join(' · ');
}
