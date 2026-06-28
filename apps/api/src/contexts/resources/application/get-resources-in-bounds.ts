import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export class GetResourcesInBounds {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    limit: number;
  }): Promise<{ items: ResourceView[] }> {
    const resources = await this.repo.findInBounds(
      EmergencyId.fromString(q.emergencyId),
      {
        minLat: q.minLat,
        minLng: q.minLng,
        maxLat: q.maxLat,
        maxLng: q.maxLng,
        limit: q.limit,
      },
    );
    return { items: resources.map(toResourceView) };
  }
}
