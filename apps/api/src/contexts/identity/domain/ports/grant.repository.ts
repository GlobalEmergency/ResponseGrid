import { Grant } from '../authorization/grant';

export const GRANT_REPOSITORY = Symbol('GrantRepository');

export interface GrantRepository {
  /** All grants held by a principal (across every scope). */
  findByPrincipal(principalId: string): Promise<Grant[]>;
  /**
   * All grants made AT a given scope (who holds a role here) — the read side of
   * scoped administration. `scopeId` is null for the platform scope.
   */
  findByScope(scopeType: string, scopeId: string | null): Promise<Grant[]>;
  findById(id: string): Promise<Grant | null>;
  save(grant: Grant): Promise<void>;
  deleteById(id: string): Promise<void>;
}
