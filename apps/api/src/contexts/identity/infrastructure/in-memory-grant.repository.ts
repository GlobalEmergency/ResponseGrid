import { GrantRepository } from '../domain/ports/grant.repository';
import { Grant, GrantSnapshot } from '../domain/authorization/grant';

export class InMemoryGrantRepository implements GrantRepository {
  private store = new Map<string, GrantSnapshot>();

  save(grant: Grant): Promise<void> {
    this.store.set(grant.id, grant.toSnapshot());
    return Promise.resolve();
  }

  findByPrincipal(principalId: string): Promise<Grant[]> {
    const result = [...this.store.values()]
      .filter((s) => s.principalId === principalId)
      .map((s) => Grant.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findById(id: string): Promise<Grant | null> {
    const snapshot = this.store.get(id);
    return Promise.resolve(snapshot ? Grant.fromSnapshot(snapshot) : null);
  }

  deleteById(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}
