import { NeedRepository, NeedFilters } from '../domain/ports/need.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, Priority } from '../domain/need-enums';
import { NeedView, toNeedView } from './need-view';

export interface GetNeedsQueueQuery {
  emergencyId: string;
  category?: Category;
  priority?: Priority;
}

export class GetNeedsQueue {
  constructor(private readonly repo: NeedRepository) {}

  async execute(q: GetNeedsQueueQuery): Promise<NeedView[]> {
    const filters: NeedFilters = {};
    if (q.category !== undefined) filters.category = q.category;
    if (q.priority !== undefined) filters.priority = q.priority;

    const pending = await this.repo.findPendingByEmergency(
      EmergencyId.fromString(q.emergencyId),
      Object.keys(filters).length > 0 ? filters : undefined,
    );
    return pending.map(toNeedView);
  }
}
