import { Shipment } from '../shipment';
import { ShipmentId } from '../shipment-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { ShipmentStatus } from '../shipment-enums';

export const SHIPMENT_REPOSITORY = Symbol('ShipmentRepository');

/** Filter for listing shipments within an emergency. AND-combined. */
export interface ListShipmentsFilter {
  status?: ShipmentStatus;
}

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: ShipmentId): Promise<Shipment | null>;
  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]>;
  /**
   * Shipments carried by a given principal ("mis expediciones"). Optionally
   * scoped to one emergency. Ordered newest-first.
   */
  findByCarrier(
    carrierId: string,
    emergencyId: EmergencyId | null,
  ): Promise<Shipment[]>;
}
