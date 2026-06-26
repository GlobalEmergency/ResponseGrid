import { Emergency } from '../emergency';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Slug } from '../slug';

export const EMERGENCY_REPOSITORY = Symbol('EmergencyRepository');

export interface EmergencyRepository {
  save(e: Emergency): Promise<void>;
  findById(id: EmergencyId): Promise<Emergency | null>;
  findBySlug(slug: Slug): Promise<Emergency | null>;
  listActive(): Promise<Emergency[]>;
}
