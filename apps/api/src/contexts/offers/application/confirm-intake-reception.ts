import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { EventBus } from '../domain/ports/event-bus';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

export interface ConfirmIntakeReceptionCommand {
  intakeId: string;
  receivedByUserId: string;
  volunteerNotes: string | null;
  evidenceFileKey: string | null;
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

    intake.confirmReception(
      cmd.receivedByUserId,
      cmd.volunteerNotes,
      cmd.evidenceFileKey,
    );
    await this.repo.save(intake);
    await this.bus.publish(intake.pullDomainEvents());
  }
}
