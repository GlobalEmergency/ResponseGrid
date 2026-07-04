import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';
import { loadResourceForManagement } from './load-resource-for-management';
import { PrincipalGrant } from './principal-grant';

export interface GetMyInventoryQuery {
  resourceId: string;
  requesterUserId: string;
  /** Request grants, so an entity-scoped point manager is authorized (#316). */
  grants?: PrincipalGrant[];
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
      grants: q.grants ?? [],
      makeForbidden: () => new UnauthorizedInventoryChangeError(),
    });

    return resource.items.map((i) => i.toSnapshot());
  }
}
