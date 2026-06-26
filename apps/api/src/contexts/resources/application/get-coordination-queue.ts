import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export class GetCoordinationQueue {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: { emergencyId: string }): Promise<ResourceView[]> {
    const pending = await this.repo.findPendingByEmergency(EmergencyId.fromString(q.emergencyId));
    return pending.map(toResourceView);
  }
}
