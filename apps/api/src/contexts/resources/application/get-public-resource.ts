import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceId } from '../domain/resource-id';
import { PublicStatus } from '../domain/resource-enums';
import { ResourceView, toResourceView } from './resource-view';

const VISIBLE = [
  PublicStatus.Active,
  PublicStatus.Saturated,
  PublicStatus.Paused,
];

/**
 * Fetch a single published resource by id, scoped to an emergency.
 * Returns null when the resource does not exist, belongs to another emergency,
 * or is not publicly visible (Hidden/Closed). Powers the public resource
 * detail page (#59 — "necesidades de este destinatario").
 */
export class GetPublicResource {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    resourceId: string;
  }): Promise<ResourceView | null> {
    const resource = await this.repo.findById(
      ResourceId.fromString(q.resourceId),
    );
    if (resource === null) return null;
    if (resource.emergencyId.value !== q.emergencyId) return null;
    if (!VISIBLE.includes(resource.publicStatus)) return null;
    return toResourceView(resource);
  }
}
