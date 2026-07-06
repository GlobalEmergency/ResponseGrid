import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { SupplyLine, SupplyLineProps } from '../../supplies/domain/supply-line';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';
import { InventoryVersionConflictError } from './inventory-version-conflict.error';
import { loadResourceForManagement } from './load-resource-for-management';
import { PrincipalGrant } from './principal-grant';

export interface UpdateMyInventoryCommand {
  resourceId: string;
  requesterUserId: string;
  lines: SupplyLineProps[];
  /**
   * The `inventoryVersion` the caller read via `GET /resources/:id/inventory`
   * (#294). Must still match the persisted version or the write is rejected
   * with `InventoryVersionConflictError` (409) instead of silently overwriting
   * a concurrent merge (inventory-entries #9, donation events #129).
   */
  expectedVersion: number;
  /** Request grants, so an entity-scoped point manager is authorized (#316). */
  grants?: PrincipalGrant[];
}

export class UpdateMyInventory {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly membershipReader: ResourceMembershipReader,
  ) {}

  async execute(cmd: UpdateMyInventoryCommand): Promise<void> {
    const resource = await loadResourceForManagement({
      repo: this.repo,
      membershipReader: this.membershipReader,
      resourceId: cmd.resourceId,
      requesterUserId: cmd.requesterUserId,
      grants: cmd.grants ?? [],
      makeForbidden: () => new UnauthorizedInventoryChangeError(),
    });

    // Fail fast on the version the caller actually read — avoids a wasted
    // write attempt in the (dominant) single-writer case. The repository still
    // re-checks atomically at the storage level below: a concurrent writer
    // could otherwise slip in between this check and the write itself.
    if (resource.inventoryVersion !== cmd.expectedVersion) {
      throw new InventoryVersionConflictError();
    }

    resource.replaceInventory(cmd.lines.map((l) => SupplyLine.create(l)));
    const applied = await this.repo.saveIfInventoryVersionMatches(
      resource,
      cmd.expectedVersion,
    );
    if (!applied) {
      throw new InventoryVersionConflictError();
    }
  }
}
