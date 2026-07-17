import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { EventBus } from '../domain/ports/event-bus';
import { SupplyLineProps } from '@globalemergency/warehouse-core/kernel';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

export interface ConfirmIntakeReceptionCommand {
  intakeId: string;
  receivedByUserId: string;
  volunteerNotes: string | null;
  evidenceFileKey: string | null;
  /** Lines actually received; when omitted the declared lines stand (#129). */
  receivedItems?: SupplyLineProps[] | null;
  /** Required when the received lines differ from the declared ones. */
  adjustmentReason?: string | null;
}

export class ConfirmIntakeReception {
  constructor(
    private readonly repo: DonationIntakeRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: ConfirmIntakeReceptionCommand): Promise<void> {
    const intake = await this.repo.findById(
      DonationIntakeId.fromString(cmd.intakeId),
    );
    if (!intake) throw new DonationIntakeNotFoundError(cmd.intakeId);

    intake.confirmReception({
      receivedByUserId: cmd.receivedByUserId,
      volunteerNotes: cmd.volunteerNotes,
      evidenceFileKey: cmd.evidenceFileKey,
      receivedLines: cmd.receivedItems
        ? cmd.receivedItems.map((item, index) => ({
            sortOrder: index,
            line: item,
          }))
        : null,
      adjustmentReason: cmd.adjustmentReason ?? null,
    });
    await this.repo.save(intake);
    await this.bus.publish(intake.pullDomainEvents());
  }
}
