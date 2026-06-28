import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '../domain/ports/shipment.repository';
import { Shipment, ShipmentSnapshot } from '../domain/shipment';
import { ShipmentId } from '../domain/shipment-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';

export class InMemoryShipmentRepository implements ShipmentRepository {
  private store = new Map<string, ShipmentSnapshot>();

  save(shipment: Shipment): Promise<void> {
    this.store.set(shipment.id.value, shipment.toSnapshot());
    return Promise.resolve();
  }

  findById(id: ShipmentId): Promise<Shipment | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Shipment.fromSnapshot(snap) : null);
  }

  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]> {
    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value)
      .filter((s) => filter.status === undefined || s.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Shipment.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findByCarrier(
    carrierId: string,
    emergencyId: EmergencyId | null,
  ): Promise<Shipment[]> {
    const result = [...this.store.values()]
      .filter((s) => s.carrierId === carrierId)
      .filter(
        (s) => emergencyId === null || s.emergencyId === emergencyId.value,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Shipment.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
