import { EmergencyId } from '../../../shared/domain/emergency-id';
import { normalizeDonorContact } from '../domain/donor-contact';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';

export interface LookupDonorByContactCommand {
  emergencyId: string;
  donorPhone: string | null;
  donorEmail: string | null;
}

export interface PendingIntakeSummary {
  id: string;
  intakeCode: string;
  targetResourceId: string;
  itemCount: number;
  createdAt: Date;
}

export interface LookupDonorByContactResult {
  donorName: string | null;
  pendingIntakes: PendingIntakeSummary[];
}

export class LookupDonorByContact {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(
    cmd: LookupDonorByContactCommand,
  ): Promise<LookupDonorByContactResult> {
    const contactNormalized = normalizeDonorContact(
      cmd.donorPhone,
      cmd.donorEmail,
    );
    const emergencyId = EmergencyId.fromString(cmd.emergencyId);

    const [donorName, pending] = await Promise.all([
      this.repo.findLatestDonorNameByContact(emergencyId, contactNormalized),
      this.repo.findPendingByContact(emergencyId, contactNormalized),
    ]);

    return {
      donorName,
      pendingIntakes: pending.map((intake) => ({
        id: intake.id.value,
        intakeCode: intake.intakeCode,
        targetResourceId: intake.targetResourceId,
        itemCount: intake.lines.length,
        createdAt: intake.createdAt,
      })),
    };
  }
}
