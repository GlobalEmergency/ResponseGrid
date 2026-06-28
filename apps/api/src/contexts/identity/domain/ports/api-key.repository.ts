import { ApiKey } from '../api-key';

export const API_KEY_REPOSITORY = Symbol('ApiKeyRepository');

export interface ApiKeyRepository {
  save(key: ApiKey): Promise<void>;
  findByPrefix(prefix: string): Promise<ApiKey | null>;
  findById(id: string): Promise<ApiKey | null>;
  listByServiceAccount(serviceAccountId: string): Promise<ApiKey[]>;
}
