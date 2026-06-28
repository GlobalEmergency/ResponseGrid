import { ApiKeyRepository } from '../domain/ports/api-key.repository';
import { ApiKey, ApiKeySnapshot } from '../domain/api-key';

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  private store = new Map<string, ApiKeySnapshot>();

  save(key: ApiKey): Promise<void> {
    this.store.set(key.id, key.toSnapshot());
    return Promise.resolve();
  }

  findByPrefix(prefix: string): Promise<ApiKey | null> {
    const snapshot = [...this.store.values()].find((k) => k.prefix === prefix);
    return Promise.resolve(snapshot ? ApiKey.fromSnapshot(snapshot) : null);
  }

  findById(id: string): Promise<ApiKey | null> {
    const snapshot = this.store.get(id);
    return Promise.resolve(snapshot ? ApiKey.fromSnapshot(snapshot) : null);
  }

  listByServiceAccount(serviceAccountId: string): Promise<ApiKey[]> {
    const result = [...this.store.values()]
      .filter((k) => k.serviceAccountId === serviceAccountId)
      .map((k) => ApiKey.fromSnapshot(k));
    return Promise.resolve(result);
  }
}
