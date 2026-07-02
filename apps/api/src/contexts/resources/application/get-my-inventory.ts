import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceId } from '../domain/resource-id';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';
import { ResourceNotFoundError } from './resource-not-found.error';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';

export interface GetMyInventoryQuery {
  resourceId: string;
  requesterUserId: string;
}

export class GetMyInventory {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly membershipReader: ResourceMembershipReader,
  ) {}

  async execute(q: GetMyInventoryQuery): Promise<SupplyLineSnapshot[]> {
    const resource = await this.repo.findById(
      ResourceId.fromString(q.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(q.resourceId);

    const isOwner = resource.ownerUserId === q.requesterUserId;
    const isCoordinator = await this.membershipReader.isCoordinator(
      q.requesterUserId,
      resource.emergencyId.value,
    );
    if (!isOwner && !isCoordinator) {
      throw new UnauthorizedInventoryChangeError();
    }

    return resource.items.map((i) => i.toSnapshot());
  }
}
