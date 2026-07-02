import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceId } from '../domain/resource-id';
import { SupplyLine, SupplyLineProps } from '../../supplies/domain/supply-line';
import { ResourceNotFoundError } from './resource-not-found.error';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';

export interface UpdateMyInventoryCommand {
  resourceId: string;
  requesterUserId: string;
  lines: SupplyLineProps[];
}

export class UpdateMyInventory {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly membershipReader: ResourceMembershipReader,
  ) {}

  async execute(cmd: UpdateMyInventoryCommand): Promise<void> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);

    const isOwner = resource.ownerUserId === cmd.requesterUserId;
    const isCoordinator = await this.membershipReader.isCoordinator(
      cmd.requesterUserId,
      resource.emergencyId.value,
    );
    if (!isOwner && !isCoordinator) {
      throw new UnauthorizedInventoryChangeError();
    }

    resource.replaceInventory(cmd.lines.map((l) => SupplyLine.create(l)));
    await this.repo.save(resource);
  }
}
