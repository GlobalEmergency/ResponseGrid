import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export interface PagedResourcesResult {
  items: ResourceView[];
  total: number;
  page: number;
  limit: number;
}

export class GetPublicResources {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    page?: number;
    limit?: number;
    category?: string;
    country?: string;
  }): Promise<PagedResourcesResult> {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 50, 100);

    const { items, total } = await this.repo.findVisiblePaged(
      EmergencyId.fromString(q.emergencyId),
      {
        page,
        limit,
        ...(q.category !== undefined && { category: q.category }),
        ...(q.country !== undefined && { country: q.country }),
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
