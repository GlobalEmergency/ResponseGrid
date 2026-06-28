import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import {
  ServiceAccount,
  ServiceAccountSnapshot,
} from '../domain/service-account';

export class InMemoryServiceAccountRepository implements ServiceAccountRepository {
  private store = new Map<string, ServiceAccountSnapshot>();

  save(serviceAccount: ServiceAccount): Promise<void> {
    this.store.set(serviceAccount.id, serviceAccount.toSnapshot());
    return Promise.resolve();
  }

  findById(id: string): Promise<ServiceAccount | null> {
    const snapshot = this.store.get(id);
    return Promise.resolve(
      snapshot ? ServiceAccount.fromSnapshot(snapshot) : null,
    );
  }

  listByOrganization(organizationId: string): Promise<ServiceAccount[]> {
    const result = [...this.store.values()]
      .filter((s) => s.ownerOrganizationId === organizationId)
      .map((s) => ServiceAccount.fromSnapshot(s));
    return Promise.resolve(result);
  }

  listAll(): Promise<ServiceAccount[]> {
    const result = [...this.store.values()].map((s) =>
      ServiceAccount.fromSnapshot(s),
    );
    return Promise.resolve(result);
  }
}
