import { Shipment } from '../shipment.js';
import { ShipmentId } from '../shipment-id.js';
import { ScopeId } from '../../kernel/index.js';
import { ShipmentStatus } from '../shipment-enums.js';

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
  nextSequence(scopeId: ScopeId): Promise<number>;
  findById(id: ShipmentId): Promise<Shipment | null>;
  findByScope(
    scopeId: ScopeId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]>;
  /**
   * Shipments carried by a given principal ("mis expediciones"). Optionally
   * scoped to one emergency. Ordered newest-first.
   */
  findByCarrier(
    carrierId: string,
    scopeId: ScopeId | null,
  ): Promise<Shipment[]>;
}
