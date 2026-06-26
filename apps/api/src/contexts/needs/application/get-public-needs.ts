import { NeedRepository, NeedFilters } from '../domain/ports/need.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedCategory, Priority } from '../domain/need-enums';
import { NeedView, toNeedView } from './need-view';

export interface GetPublicNeedsQuery {
  emergencyId: string;
  category?: NeedCategory;
  priority?: Priority;
}

export class GetPublicNeeds {
  constructor(private readonly repo: NeedRepository) {}

  async execute(q: GetPublicNeedsQuery): Promise<NeedView[]> {
    const filters: NeedFilters = {};
    if (q.category !== undefined) filters.category = q.category;
    if (q.priority !== undefined) filters.priority = q.priority;

    const validated = await this.repo.findValidatedByEmergency(
      EmergencyId.fromString(q.emergencyId),
      Object.keys(filters).length > 0 ? filters : undefined,
    );
    return validated.map(toNeedView);
  }
}
