import { Emergency } from '../emergency';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Slug } from '../slug';

export const EMERGENCY_REPOSITORY = Symbol('EmergencyRepository');

export interface EmergencyRepository {
  save(e: Emergency): Promise<void>;
  findById(id: EmergencyId): Promise<Emergency | null>;
  findBySlug(slug: Slug): Promise<Emergency | null>;
  /**
   * Resolves a set of emergency ids to their aggregates, regardless of status
   * (active, paused or closed). Unknown ids are simply omitted. Used to surface
   * the emergencies a principal is granted into — including non-active ones,
   * which `listActive` deliberately excludes.
   */
  findByIds(ids: EmergencyId[]): Promise<Emergency[]>;
  listActive(): Promise<Emergency[]>;
}
