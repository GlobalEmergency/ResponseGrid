import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { DonationIntakeSearchHit } from './search-donation-intakes';

export class ListPendingIntakesByResource {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(resourceId: string): Promise<DonationIntakeSearchHit[]> {
    const intakes = await this.repo.findPendingByResource(resourceId);

    return intakes.map((intake) => ({
      id: intake.id.value,
      intakeCode: intake.intakeCode,
      donorName: intake.donorName,
      donorPhone: intake.donorPhone,
      donorEmail: intake.donorEmail,
      status: intake.status,
      targetResourceId: intake.targetResourceId,
      itemCount: intake.lines.length,
      createdAt: intake.createdAt,
    }));
  }
}
