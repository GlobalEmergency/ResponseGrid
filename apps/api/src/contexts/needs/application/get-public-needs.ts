import { NeedRepository, NeedFilters } from '../domain/ports/need.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, Priority } from '../domain/need-enums';
import { NeedView, toPublicNeedView } from './need-view';

export interface GetPublicNeedsQuery {
  emergencyId: string;
  category?: Category;
  priority?: Priority;
  /** Filter to needs linked to a specific resource / final recipient (#60). */
  resourceId?: string;
  /** Optional server-side pagination. When omitted, the full set is returned. */
  limit?: number;
  offset?: number;
}

export class GetPublicNeeds {
  constructor(private readonly repo: NeedRepository) {}

  async execute(q: GetPublicNeedsQuery): Promise<NeedView[]> {
    const filters: NeedFilters = {};
    if (q.category !== undefined) filters.category = q.category;
    if (q.priority !== undefined) filters.priority = q.priority;
    if (q.resourceId !== undefined) filters.resourceId = q.resourceId;

    const pagination =
      q.limit !== undefined
        ? { limit: q.limit, offset: q.offset ?? 0 }
        : undefined;

    const validated = await this.repo.findValidatedByEmergency(
      EmergencyId.fromString(q.emergencyId),
      Object.keys(filters).length > 0 ? filters : undefined,
      pagination,
    );
    return validated.map(toPublicNeedView);
  }
}
