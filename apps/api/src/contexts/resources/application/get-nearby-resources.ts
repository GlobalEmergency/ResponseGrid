import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export interface NearbyResourceView extends ResourceView {
  distanceMeters: number;
}

export class GetNearbyResources {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    lat: number;
    lng: number;
    radiusMeters: number;
    limit: number;
  }): Promise<{ items: NearbyResourceView[] }> {
    const results = await this.repo.findNearbyVisible(
      EmergencyId.fromString(q.emergencyId),
      { lat: q.lat, lng: q.lng, radiusMeters: q.radiusMeters, limit: q.limit },
    );
    return {
      items: results.map((r) => ({
        ...toResourceView(r.resource),
        distanceMeters: r.distanceMeters,
      })),
    };
  }
}
