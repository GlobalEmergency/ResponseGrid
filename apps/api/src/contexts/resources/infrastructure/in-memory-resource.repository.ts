import { ResourceRepository } from '../domain/ports/resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { VerificationLevel, PublicStatus } from '../domain/resource-enums';

export class InMemoryResourceRepository implements ResourceRepository {
  private store = new Map<string, ReturnType<Resource['toSnapshot']>>();

  save(resource: Resource): Promise<void> {
    this.store.set(resource.id.value, resource.toSnapshot());
    return Promise.resolve();
  }

  findById(id: ResourceId): Promise<Resource | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Resource.fromSnapshot(snap) : null);
  }

  findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          s.verificationLevel === VerificationLevel.Unverified,
      )
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          s.publicStatus === PublicStatus.Active,
      )
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve(result);
  }

  countByEmergencyGroupedByPublicStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<PublicStatus, number>> {
    const result: Record<PublicStatus, number> = {
      [PublicStatus.Hidden]: 0,
      [PublicStatus.Active]: 0,
      [PublicStatus.Saturated]: 0,
      [PublicStatus.Paused]: 0,
      [PublicStatus.Closed]: 0,
    };
    for (const snap of this.store.values()) {
      if (snap.emergencyId === emergencyId.value) {
        const status = snap.publicStatus;
        if (status in result) {
          result[status]++;
        }
      }
    }
    return Promise.resolve(result);
  }

  findByOwnerAndEmergency(
    ownerUserId: string,
    emergencyId: EmergencyId,
  ): Promise<Resource[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value && s.ownerUserId === ownerUserId,
      )
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findVisibleByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const visible = new Set<PublicStatus>([
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ]);
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value && visible.has(s.publicStatus),
      )
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findByExternal(
    sourceName: string,
    externalId: string,
  ): Promise<Resource | null> {
    const snap = [...this.store.values()].find(
      (s) =>
        s.provenance?.sourceName === sourceName &&
        s.provenance?.externalId === externalId,
    );
    return Promise.resolve(snap ? Resource.fromSnapshot(snap) : null);
  }

  findVisiblePaged(
    emergencyId: EmergencyId,
    q: { page: number; limit: number; category?: string; country?: string },
  ): Promise<{ items: Resource[]; total: number }> {
    const visible = new Set<PublicStatus>([
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ]);
    let all = [...this.store.values()].filter(
      (s) => s.emergencyId === emergencyId.value && visible.has(s.publicStatus),
    );
    if (q.category) {
      all = all.filter((s) => s.accepts.includes(q.category!));
    }
    if (q.country) {
      all = all.filter((s) => s.country === q.country);
    }
    const total = all.length;
    const offset = (q.page - 1) * q.limit;
    const items = all
      .slice(offset, offset + q.limit)
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve({ items, total });
  }

  facets(emergencyId: EmergencyId): Promise<{
    byCategory: Record<string, number>;
    byCountry: Record<string, number>;
    total: number;
  }> {
    const visible = new Set<PublicStatus>([
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ]);
    const all = [...this.store.values()].filter(
      (s) => s.emergencyId === emergencyId.value && visible.has(s.publicStatus),
    );
    const byCategory: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const s of all) {
      for (const cat of s.accepts) {
        byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      }
      if (s.country) {
        byCountry[s.country] = (byCountry[s.country] ?? 0) + 1;
      }
    }
    return Promise.resolve({ byCategory, byCountry, total: all.length });
  }
}
