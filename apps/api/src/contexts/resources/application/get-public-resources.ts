import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export class GetPublicResources {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: { emergencyId: string }): Promise<ResourceView[]> {
    const active = await this.repo.findActiveByEmergency(EmergencyId.fromString(q.emergencyId));
    return active.map(toResourceView);
  }
}
