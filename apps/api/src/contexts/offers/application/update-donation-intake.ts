import { DonationIntakeId } from '../domain/donation-intake-id';
import { contactMatchesIntake } from '../domain/donor-contact';
import { DonationIntakeContactMismatchError } from '../domain/donation-intake-errors';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';
import { SupplyLineProps } from '@globalemergency/warehouse-core/kernel';

export interface UpdateDonationIntakeCommand {
  intakeId: string;
  intakeCode: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  items: SupplyLineProps[];
}

export class UpdateDonationIntake {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(cmd: UpdateDonationIntakeCommand): Promise<void> {
    const intake = await this.repo.findById(
      DonationIntakeId.fromString(cmd.intakeId),
    );
    if (!intake) throw new DonationIntakeNotFoundError(cmd.intakeId);

    if (intake.intakeCode !== cmd.intakeCode.trim().toUpperCase()) {
      throw new DonationIntakeContactMismatchError();
    }

    if (
      !contactMatchesIntake(intake.toSnapshot(), cmd.donorPhone, cmd.donorEmail)
    ) {
      throw new DonationIntakeContactMismatchError();
    }

    intake.updateContent(
      {
        donorName: cmd.donorName,
        donorPhone: cmd.donorPhone,
        donorEmail: cmd.donorEmail,
      },
      cmd.items.map((item, index) => ({
        sortOrder: index,
        line: item,
      })),
    );

    await this.repo.save(intake);
  }
}
