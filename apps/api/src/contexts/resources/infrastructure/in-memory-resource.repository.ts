import { ResourceRepository } from '../domain/ports/resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { VerificationLevel, PublicStatus } from '../domain/resource-enums';

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    q: {
      page: number;
      limit: number;
      category?: string;
      country?: string;
      q?: string;
    },
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
    if (q.q) {
      const term = q.q.toLowerCase();
      all = all.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.location.address.toLowerCase().includes(term) ||
          (s.city != null && s.city.toLowerCase().includes(term)),
      );
    }
    const total = all.length;
    const offset = (q.page - 1) * q.limit;
    const items = all
      .slice(offset, offset + q.limit)
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve({ items, total });
  }

  findNearbyVisible(
    emergencyId: EmergencyId,
    q: { lat: number; lng: number; radiusMeters: number; limit: number },
  ): Promise<Array<{ resource: Resource; distanceMeters: number }>> {
    const visible = new Set<PublicStatus>([
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ]);
    const withDist = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value && visible.has(s.publicStatus),
      )
      .map((s) => {
        const dist = haversineMeters(
          q.lat,
          q.lng,
          s.location.latitude,
          s.location.longitude,
        );
        return { snap: s, dist };
      })
      .filter(({ dist }) => dist <= q.radiusMeters)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, q.limit);

    return Promise.resolve(
      withDist.map(({ snap, dist }) => ({
        resource: Resource.fromSnapshot(snap),
        distanceMeters: Math.round(dist),
      })),
    );
  }

  findInBounds(
    emergencyId: EmergencyId,
    q: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
      limit: number;
    },
  ): Promise<Resource[]> {
    const visible = new Set<PublicStatus>([
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ]);
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          visible.has(s.publicStatus) &&
          s.location.latitude >= q.minLat &&
          s.location.latitude <= q.maxLat &&
          s.location.longitude >= q.minLng &&
          s.location.longitude <= q.maxLng,
      )
      .slice(0, q.limit)
      .map((s) => Resource.fromSnapshot(s));
    return Promise.resolve(result);
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
