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

export interface GetMyInventoryResult {
  items: SupplyLineSnapshot[];
  /**
   * Optimistic-concurrency version of the declared inventory (#294). The
   * caller must send it back as `expectedVersion` on
   * `PUT /resources/:id/inventory`; a mismatch there means the inventory
   * changed since this read.
   */
  version: number;
}

export class GetMyInventory {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly membershipReader: ResourceMembershipReader,
  ) {}

  async execute(q: GetMyInventoryQuery): Promise<GetMyInventoryResult> {
    const resource = await loadResourceForManagement({
      repo: this.repo,
      membershipReader: this.membershipReader,
      resourceId: q.resourceId,
      requesterUserId: q.requesterUserId,
      grants: q.grants ?? [],
      makeForbidden: () => new UnauthorizedInventoryChangeError(),
    });

    return {
      items: resource.items.map((i) => i.toSnapshot()),
      version: resource.inventoryVersion,
    };
  }
}
