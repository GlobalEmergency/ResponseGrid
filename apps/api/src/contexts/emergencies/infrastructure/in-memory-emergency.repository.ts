import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyStatus } from '../domain/emergency-status';
import { Slug } from '../domain/slug';

export class InMemoryEmergencyRepository implements EmergencyRepository {
  private store = new Map<string, ReturnType<Emergency['toSnapshot']>>();

  save(e: Emergency): Promise<void> {
    this.store.set(e.id.value, e.toSnapshot());
    return Promise.resolve();
  }

  findById(id: EmergencyId): Promise<Emergency | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Emergency.fromSnapshot(snap) : null);
  }

  findBySlug(slug: Slug): Promise<Emergency | null> {
    const snap = [...this.store.values()].find((s) => s.slug === slug.value);
    return Promise.resolve(snap ? Emergency.fromSnapshot(snap) : null);
  }

  findByIds(ids: EmergencyId[]): Promise<Emergency[]> {
    const wanted = new Set(ids.map((id) => id.value));
    const result = [...this.store.values()]
      .filter((s) => wanted.has(s.id))
      .map((s) => Emergency.fromSnapshot(s));
    return Promise.resolve(result);
  }

  listActive(): Promise<Emergency[]> {
    const result = [...this.store.values()]
      .filter((s) => s.status === EmergencyStatus.Active)
      .map((s) => Emergency.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
