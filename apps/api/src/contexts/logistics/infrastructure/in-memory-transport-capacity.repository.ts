import {
  TransportCapacityRepository,
  TransportCapacityFilters,
} from '../domain/ports/transport-capacity.repository';
import {
  TransportCapacity,
  TransportCapacitySnapshot,
} from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';

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
    filters?: TransportCapacityFilters,
  ): Promise<TransportCapacity[]> {
    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value)
      .filter((s) => filters?.mode === undefined || s.mode === filters.mode)
      .filter(
        (s) => filters?.status === undefined || s.status === filters.status,
      )
      .map((s) => TransportCapacity.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
