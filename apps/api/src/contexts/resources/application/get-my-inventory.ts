import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';
import { loadResourceForManagement } from './load-resource-for-management';

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
    const resource = await loadResourceForManagement({
      repo: this.repo,
      membershipReader: this.membershipReader,
      resourceId: q.resourceId,
      requesterUserId: q.requesterUserId,
      makeForbidden: () => new UnauthorizedInventoryChangeError(),
    });

    return resource.items.map((i) => i.toSnapshot());
  }
}
