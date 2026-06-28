import {
  ListCapacitiesFilter,
  TransportCapacityRepository,
} from '../domain/ports/transport-capacity.repository';
import {
  TransportCapacity,
  TransportCapacitySnapshot,
} from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { capacityWindowOverlaps } from '../domain/window-overlap';

export class InMemoryTransportCapacityRepository implements TransportCapacityRepository {
  private store = new Map<string, TransportCapacitySnapshot>();

  save(capacity: TransportCapacity): Promise<void> {
    this.store.set(capacity.id.value, capacity.toSnapshot());
    return Promise.resolve();
  }

  findById(id: TransportCapacityId): Promise<TransportCapacity | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? TransportCapacity.fromSnapshot(snap) : null);
  }

  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListCapacitiesFilter,
  ): Promise<TransportCapacity[]> {
    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value)
      .filter((s) => filter.mode === undefined || s.mode === filter.mode)
      .filter((s) => filter.status === undefined || s.status === filter.status)
      .filter((s) =>
        capacityWindowOverlaps(s.window, {
          from: filter.availableFrom,
          to: filter.availableTo,
        }),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => TransportCapacity.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
