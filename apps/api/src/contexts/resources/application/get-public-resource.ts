import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceId } from '../domain/resource-id';
import { PublicStatus, VerificationLevel } from '../domain/resource-enums';
import { ResourceDetailView, toResourceDetailView } from './resource-view';

const VISIBLE = [
  PublicStatus.Active,
  PublicStatus.Saturated,
  PublicStatus.Paused,
];

const PUBLICLY_VISIBLE_VERIFICATION = [
  VerificationLevel.Verified,
  VerificationLevel.Official,
];

/**
 * Fetch a single published resource by id, scoped to an emergency.
 * Returns null when the resource does not exist, belongs to another emergency,
 * is not publicly visible (Hidden/Closed), or is still `unverified` — the
 * public API only exposes verified/official points (#94). Powers the public
 * resource detail page (#59 — "necesidades de este destinatario").
 */
export class GetPublicResource {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    resourceId: string;
  }): Promise<ResourceDetailView | null> {
    const resource = await this.repo.findById(
      ResourceId.fromString(q.resourceId),
    );
    if (resource === null) return null;
    if (resource.emergencyId.value !== q.emergencyId) return null;
    if (!VISIBLE.includes(resource.publicStatus)) return null;
    if (!PUBLICLY_VISIBLE_VERIFICATION.includes(resource.verificationLevel))
      return null;
    return toResourceDetailView(resource);
  }
}
