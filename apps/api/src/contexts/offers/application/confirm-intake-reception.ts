import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

export interface ConfirmIntakeReceptionCommand {
  intakeId: string;
  receivedByUserId: string;
  volunteerNotes: string | null;
  evidenceFileKey: string | null;
}

export class ConfirmIntakeReception {
  constructor(private readonly repo: DonationIntakeRepository) {}

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
  }
}
