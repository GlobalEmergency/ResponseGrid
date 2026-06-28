import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';

export interface ResourceFacets {
  byCategory: Record<string, number>;
  byCountry: Record<string, number>;
  total: number;
}

export class GetResourceFacets {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: { emergencyId: string }): Promise<ResourceFacets> {
    return this.repo.facets(EmergencyId.fromString(q.emergencyId));
  }
}
