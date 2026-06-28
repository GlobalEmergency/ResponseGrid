import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceId } from '../domain/resource-id';
import { ResourceNotFoundError } from './resource-not-found.error';
import { MutationAuditResult } from '../../../shared/domain/mutation-audit';

export interface DiscardResourceCommand {
  resourceId: string;
}

/**
 * Discard a resource pending verification: its verification level becomes
 * `rejected`, so it leaves the coordination queue and can never be published.
 * The HTTP layer records the mandatory reason in the audit trail.
 */
export class DiscardResource {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(cmd: DiscardResourceCommand): Promise<MutationAuditResult> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);

    const before = resource.verificationLevel;
    resource.discard();
    await this.repo.save(resource);

    return {
      emergencyId: resource.emergencyId.value,
      changes: [
        {
          field: 'verificationLevel',
          before,
          after: resource.verificationLevel,
        },
      ],
      targetStatus: resource.verificationLevel,
    };
  }
}
