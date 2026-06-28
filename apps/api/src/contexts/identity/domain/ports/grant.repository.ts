import { Grant } from '../authorization/grant';

export const GRANT_REPOSITORY = Symbol('GrantRepository');

export interface GrantRepository {
  /** All grants held by a principal (across every scope). */
  findByPrincipal(principalId: string): Promise<Grant[]>;
  findById(id: string): Promise<Grant | null>;
  save(grant: Grant): Promise<void>;
  deleteById(id: string): Promise<void>;
}
