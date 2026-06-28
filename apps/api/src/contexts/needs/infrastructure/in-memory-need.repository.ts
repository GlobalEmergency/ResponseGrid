import { NeedRepository, NeedFilters } from '../domain/ports/need.repository';
import { Need, NeedSnapshot } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedStatus } from '../domain/need-enums';

export class InMemoryNeedRepository implements NeedRepository {
  private store = new Map<string, NeedSnapshot>();

  save(need: Need): Promise<void> {
    this.store.set(need.id.value, need.toSnapshot());
    return Promise.resolve();
  }

  findById(id: NeedId): Promise<Need | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Need.fromSnapshot(snap) : null);
  }

  findValidatedByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    const now = new Date();
    const result = [...this.store.values()]
      .filter((s) => {
        if (s.emergencyId !== emergencyId.value) return false;
        if (s.status !== NeedStatus.Validated) return false;
        // Exclude expired: expiresAt IS NOT NULL AND expiresAt <= now
        if (
          s.expiresAt !== null &&
          s.expiresAt !== undefined &&
          s.expiresAt <= now
        )
          return false;
        if (filters?.priority !== undefined && s.priority !== filters.priority)
          return false;
        if (
          filters?.category !== undefined &&
          !s.items.some((i) => i.category === filters.category)
        )
          return false;
        if (
          filters?.resourceId !== undefined &&
          filters.resourceId !== null &&
          (s.resourceId ?? null) !== filters.resourceId
        )
          return false;
        return true;
      })
      .map((s) => Need.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findExpiredByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    const now = new Date();
    const result = [...this.store.values()]
      .filter((s) => {
        if (s.emergencyId !== emergencyId.value) return false;
        if (s.status !== NeedStatus.Validated) return false;
        // Only expired: expiresAt IS NOT NULL AND expiresAt <= now
        if (!s.expiresAt || s.expiresAt > now) return false;
        if (filters?.priority !== undefined && s.priority !== filters.priority)
          return false;
        if (
          filters?.category !== undefined &&
          !s.items.some((i) => i.category === filters.category)
        )
          return false;
        if (
          filters?.resourceId !== undefined &&
          filters.resourceId !== null &&
          (s.resourceId ?? null) !== filters.resourceId
        )
          return false;
        return true;
      })
      .map((s) => Need.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findPendingByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    const result = [...this.store.values()]
      .filter((s) => {
        if (s.emergencyId !== emergencyId.value) return false;
        if (s.status !== NeedStatus.Pending) return false;
        if (filters?.priority !== undefined && s.priority !== filters.priority)
          return false;
        if (
          filters?.category !== undefined &&
          !s.items.some((i) => i.category === filters.category)
        )
          return false;
        if (
          filters?.resourceId !== undefined &&
          filters.resourceId !== null &&
          (s.resourceId ?? null) !== filters.resourceId
        )
          return false;
        return true;
      })
      .map((s) => Need.fromSnapshot(s));
    return Promise.resolve(result);
  }

  countByEmergencyGroupedByStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<NeedStatus, number>> {
    const result: Record<NeedStatus, number> = {
      [NeedStatus.Pending]: 0,
      [NeedStatus.Validated]: 0,
      [NeedStatus.Rejected]: 0,
      [NeedStatus.Fulfilled]: 0,
    };
    for (const snap of this.store.values()) {
      if (snap.emergencyId === emergencyId.value) {
        const status = snap.status;
        if (status in result) {
          result[status]++;
        }
      }
    }
    return Promise.resolve(result);
  }
}
