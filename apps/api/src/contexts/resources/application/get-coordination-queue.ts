import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { toResourceView } from './resource-view';
import { PagedResourcesResult } from './get-public-resources';

/**
 * Coordination queue: the resources still pending verification for an
 * emergency, paginated and searchable. An emergency seeded from an external
 * import can hold hundreds of unverified points, so the queue must page and
 * filter (type + free text) instead of returning everything at once.
 */
export class GetCoordinationQueue {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    page?: number;
    limit?: number;
    type?: string;
    q?: string;
  }): Promise<PagedResourcesResult> {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 50, 100);

    const { items, total } = await this.repo.findPendingByEmergencyPaged(
      EmergencyId.fromString(q.emergencyId),
      {
        page,
        limit,
        ...(q.type !== undefined && { type: q.type }),
        ...(q.q !== undefined && q.q !== '' && { q: q.q }),
      },
    );

    return {
      items: items.map(toResourceView),
      total,
      page,
      limit,
    };
  }
}
