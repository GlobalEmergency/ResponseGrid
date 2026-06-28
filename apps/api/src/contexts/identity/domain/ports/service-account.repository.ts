import { ServiceAccount } from '../service-account';

export const SERVICE_ACCOUNT_REPOSITORY = Symbol('ServiceAccountRepository');

export interface ServiceAccountRepository {
  save(serviceAccount: ServiceAccount): Promise<void>;
  findById(id: string): Promise<ServiceAccount | null>;
  listByOrganization(organizationId: string): Promise<ServiceAccount[]>;
}
