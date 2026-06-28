import { EmergencyId } from '../../../shared/domain/emergency-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';

export interface SearchDonationIntakesCommand {
  emergencyId: string;
  query: string;
}

export interface DonationIntakeSearchHit {
  id: string;
  intakeCode: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  status: string;
  targetResourceId: string;
  itemCount: number;
  createdAt: Date;
}

export class SearchDonationIntakes {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(
    cmd: SearchDonationIntakesCommand,
  ): Promise<DonationIntakeSearchHit[]> {
    const q = cmd.query.trim();
    if (!q) return [];

    const intakes = await this.repo.search(
      EmergencyId.fromString(cmd.emergencyId),
      q,
    );

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
