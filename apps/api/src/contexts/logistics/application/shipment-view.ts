import { Shipment } from '../domain/shipment';
import { ShipmentItemSnapshot } from '../domain/shipment-item';

export interface ShipmentItemView {
  description: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
}

export interface ShipmentView {
  id: string;
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  items: ShipmentItemView[];
  assignedCapacityId: string | null;
  carrierType: string | null;
  carrierId: string | null;
  manifest: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toItemView(i: ShipmentItemSnapshot): ShipmentItemView {
  return {
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    category: i.category,
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
    assignedCapacityId: snap.assignedCapacityId,
    carrierType: snap.carrierType,
    carrierId: snap.carrierId,
    manifest: snap.manifest,
    status: snap.status,
    createdAt: snap.createdAt.toISOString(),
    updatedAt: snap.updatedAt.toISOString(),
  };
}
