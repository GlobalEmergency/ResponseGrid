import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { PublicStatus } from '../domain/resource-enums';
import { UnauthorizedStatusChangeError } from './unauthorized-status-change.error';
import { loadResourceForManagement } from './load-resource-for-management';
import { PrincipalGrant } from './principal-grant';

export interface UpdateResourcePublicStatusCommand {
  resourceId: string;
  targetStatus: PublicStatus;
  requesterUserId: string;
  /** Request grants, so an entity-scoped point manager is authorized (#316). */
  grants?: PrincipalGrant[];
}

export class UpdateResourcePublicStatus {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly membershipReader: ResourceMembershipReader,
  ) {}

  async execute(cmd: UpdateResourcePublicStatusCommand): Promise<void> {
    const resource = await loadResourceForManagement({
      repo: this.repo,
      membershipReader: this.membershipReader,
      resourceId: cmd.resourceId,
      requesterUserId: cmd.requesterUserId,
      grants: cmd.grants ?? [],
      makeForbidden: () => new UnauthorizedStatusChangeError(),
    });

    resource.changePublicStatus(cmd.targetStatus);
    await this.repo.save(resource);
  }
}
