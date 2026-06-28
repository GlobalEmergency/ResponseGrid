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

/**
 * A capacity's window overlaps the requested [from, to] interval when it does
 * not end before `from` and does not start after `to`. Null bounds are
 * open-ended and always overlap on that side.
 */
function windowOverlaps(
  snap: TransportCapacitySnapshot,
  filter: ListCapacitiesFilter,
): boolean {
  if (filter.availableFrom !== undefined && snap.window.to !== null) {
    if (snap.window.to < filter.availableFrom) return false;
  }
  if (filter.availableTo !== undefined && snap.window.from !== null) {
    if (snap.window.from > filter.availableTo) return false;
  }
  return true;
}

export class InMemoryTransportCapacityRepository
  implements TransportCapacityRepository
{
  private store = new Map<string, TransportCapacitySnapshot>();

  save(capacity: TransportCapacity): Promise<void> {
    this.store.set(capacity.id.value, capacity.toSnapshot());
    return Promise.resolve();
  }

  findById(id: TransportCapacityId): Promise<TransportCapacity | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(
      snap ? TransportCapacity.fromSnapshot(snap) : null,
    );
  }

  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListCapacitiesFilter,
  ): Promise<TransportCapacity[]> {
    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value)
      .filter((s) => filter.mode === undefined || s.mode === filter.mode)
      .filter((s) => filter.status === undefined || s.status === filter.status)
      .filter((s) => windowOverlaps(s, filter))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => TransportCapacity.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
