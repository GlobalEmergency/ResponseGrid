import { Shipment } from '../domain/shipment';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';

export interface ShipmentItemView {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  presentation: string | null;
}

export interface ShipmentView {
  id: string;
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  items: ShipmentItemView[];
  containerIds: string[];
  assignedCapacityId: string | null;
  carrierType: string | null;
  carrierId: string | null;
  manifest: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toItemView(i: SupplyLineSnapshot): ShipmentItemView {
  return {
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    category: i.category,
    presentation: i.presentation ?? null,
  };
}

export function toShipmentView(s: Shipment): ShipmentView {
  const snap = s.toSnapshot();
  return {
    id: snap.id,
    emergencyId: snap.emergencyId,
    originResourceId: snap.originResourceId,
    destinationResourceId: snap.destinationResourceId,
    items: snap.items.map(toItemView),
    containerIds: snap.containerIds,
    assignedCapacityId: snap.assignedCapacityId,
    carrierType: snap.carrierType,
    carrierId: snap.carrierId,
    manifest: snap.manifest,
    status: snap.status,
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}
