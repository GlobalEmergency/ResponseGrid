import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '@globalemergency/warehouse-core/logistics';
import {
  Shipment,
  ShipmentSnapshot,
} from '@globalemergency/warehouse-core/logistics';
import { ShipmentId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';

export class InMemoryShipmentRepository implements ShipmentRepository {
  private store = new Map<string, ShipmentSnapshot>();
  private sequences = new Map<string, number>();

  save(shipment: Shipment): Promise<void> {
    this.store.set(shipment.id.value, shipment.toSnapshot());
    return Promise.resolve();
  }

  nextSequence(scopeId: ScopeId): Promise<number> {
    const next = (this.sequences.get(scopeId.value) ?? 0) + 1;
    this.sequences.set(scopeId.value, next);
    return Promise.resolve(next);
  }

  findById(id: ShipmentId): Promise<Shipment | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Shipment.fromSnapshot(snap) : null);
  }

  findByScope(
    scopeId: ScopeId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]> {
    const result = [...this.store.values()]
      .filter((s) => s.scopeId === scopeId.value)
      .filter((s) => filter.status === undefined || s.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Shipment.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findByCarrier(
    carrierId: string,
    scopeId: ScopeId | null,
  ): Promise<Shipment[]> {
    const result = [...this.store.values()]
      .filter((s) => s.carrierId === carrierId)
      .filter((s) => scopeId === null || s.scopeId === scopeId.value)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Shipment.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
