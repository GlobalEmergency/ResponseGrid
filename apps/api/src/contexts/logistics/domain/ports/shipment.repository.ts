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
  /**
   * Atomically allocates the next expedition-code sequence for an emergency
   * (mirror of the container-code allocator, #140/#163): monotonic, concurrency-
   * safe, and decoupled from the live row count so a deleted shipment never
   * frees its code.
   */
  nextSequence(emergencyId: EmergencyId): Promise<number>;
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
