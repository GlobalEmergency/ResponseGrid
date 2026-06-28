import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

export interface MarkIntakeIncompleteCommand {
  intakeId: string;
  volunteerNotes: string | null;
}

export class MarkIntakeIncomplete {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(cmd: MarkIntakeIncompleteCommand): Promise<void> {
    const intake = await this.repo.findById(
      DonationIntakeId.fromString(cmd.intakeId),
    );
    if (!intake) throw new DonationIntakeNotFoundError(cmd.intakeId);

    intake.markIncomplete(cmd.volunteerNotes);
    await this.repo.save(intake);
  }
}
