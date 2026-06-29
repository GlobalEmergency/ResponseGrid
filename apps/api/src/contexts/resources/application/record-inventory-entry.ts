import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceId } from '../domain/resource-id';
import { SupplyLine, SupplyLineProps } from '../../supplies/domain/supply-line';
import { ResourceNotFoundError } from './resource-not-found.error';

export interface RecordInventoryEntryCommand {
  resourceId: string;
  lines: SupplyLineProps[];
}

/**
 * Manual inventory entry (#9): an operator records supply lines received at a
 * point straight into its declared stock. The manual capture channel that
 * converges on the same {@link Resource.receiveInventory} sink the donation
 * reception worker feeds (#129) — merge-by-identity and persistence live in the
 * aggregate and repository, so both channels stay consistent.
 */
export class RecordInventoryEntry {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(cmd: RecordInventoryEntryCommand): Promise<void> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);

    resource.receiveInventory(cmd.lines.map((line) => SupplyLine.create(line)));
    await this.repo.save(resource);
  }
}
