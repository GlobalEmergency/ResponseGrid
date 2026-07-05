import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { SupplyLine, SupplyLineProps } from '../../supplies/domain/supply-line';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';
import { loadResourceForManagement } from './load-resource-for-management';
import { PrincipalGrant } from './principal-grant';

export interface UpdateMyInventoryCommand {
  resourceId: string;
  requesterUserId: string;
  lines: SupplyLineProps[];
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

    // Last-write-wins: the whole snapshot replaces the persisted lines with no
    // version check, so a line merged concurrently via receiveInventory
    // (intake entries #9, donation events #129) between the owner's form load
    // and this save is overwritten. Accepted for now — revisit with an
    // optimistic version/If-Match if it bites in the field.
    resource.replaceInventory(cmd.lines.map((l) => SupplyLine.create(l)));
    await this.repo.save(resource);
  }
}
