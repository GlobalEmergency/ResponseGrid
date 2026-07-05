import { EmergencyId } from '../../../shared/domain/emergency-id';
import { normalizeDonorContact } from '../domain/donor-contact';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';

export interface LookupDonorByContactCommand {
  emergencyId: string;
  donorPhone: string | null;
  donorEmail: string | null;
}

/**
 * Non-actionable summary of a donor's pending intake.
 *
 * SECURITY: this endpoint is public and keyed only on a (guessable) phone/email,
 * so the summary deliberately OMITS the `intakeCode` and `targetResourceId`.
 * The intake code is the credential the public PATCH requires; re-disclosing it
 * on a contact-only lookup would let an attacker tamper with a stranger's
 * donation. The code is delivered to the donor at creation time (receipt) only.
 */
export interface PendingIntakeSummary {
  id: string;
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
        itemCount: intake.lines.length,
        createdAt: intake.createdAt,
      })),
    };
  }
}
