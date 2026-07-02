import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { PublicStatus } from '../domain/resource-enums';
import { UnauthorizedStatusChangeError } from './unauthorized-status-change.error';
import { loadResourceForManagement } from './load-resource-for-management';

export interface UpdateResourcePublicStatusCommand {
  resourceId: string;
  targetStatus: PublicStatus;
  requesterUserId: string;
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
      makeForbidden: () => new UnauthorizedStatusChangeError(),
    });

    resource.changePublicStatus(cmd.targetStatus);
    await this.repo.save(resource);
  }
}
