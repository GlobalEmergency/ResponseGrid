import { ResourceId } from '../domain/resource-id';
import { ResourceRepository } from '../domain/ports/resource.repository';
import {
  SupplyLine,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';

export interface ReceiveDonationIntoInventoryCommand {
  targetResourceId: string;
  lines: SupplyLineSnapshot[];
}

export type ReceiveDonationResult = 'applied' | 'resource_not_found';

/**
 * Apply a confirmed donation's lines to the target collection point's declared
 * inventory (#129), so the point's stock reflects what has actually arrived.
 * Consumed off the `donation_intake.received` event.
 *
 * Idempotency: the underlying queue is at-least-once, so a redelivery after a
 * successful commit would re-add the lines. Acceptable for now — a transactional
 * dedup ledger is future work tied to the entries/traceability issues (#9/#12);
 * the repository save is atomic, so a *failed* attempt never partially applies.
 */
export class ReceiveDonationIntoInventory {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(
    cmd: ReceiveDonationIntoInventoryCommand,
  ): Promise<ReceiveDonationResult> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.targetResourceId),
    );
    if (!resource) return 'resource_not_found';

    resource.receiveInventory(
      cmd.lines.map((line) => SupplyLine.fromSnapshot(line)),
    );
    await this.repo.save(resource);
    return 'applied';
  }
}
