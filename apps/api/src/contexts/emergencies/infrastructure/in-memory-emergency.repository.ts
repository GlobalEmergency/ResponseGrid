import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyStatus } from '../domain/emergency-status';
import { Slug } from '../domain/slug';

export class InMemoryEmergencyRepository implements EmergencyRepository {
  private store = new Map<string, ReturnType<Emergency['toSnapshot']>>();

  async save(e: Emergency): Promise<void> {
    this.store.set(e.id.value, e.toSnapshot());
  }

  async findById(id: EmergencyId): Promise<Emergency | null> {
    const snap = this.store.get(id.value);
    return snap ? Emergency.fromSnapshot(snap) : null;
  }

  async findBySlug(slug: Slug): Promise<Emergency | null> {
    const snap = [...this.store.values()].find((s) => s.slug === slug.value);
    return snap ? Emergency.fromSnapshot(snap) : null;
  }

  async listActive(): Promise<Emergency[]> {
    return [...this.store.values()]
      .filter((s) => s.status === EmergencyStatus.Active)
      .map((s) => Emergency.fromSnapshot(s));
  }
}
