import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { IntakeResourceLookup } from '../domain/ports/intake-resource-lookup';

export interface MyDonationIntakeView {
  intakeCode: string;
  status: string;
  emergencyId: string;
  /** Slug of the donation's emergency (null if its point no longer resolves). */
  emergencySlug: string | null;
  /** Destination collection point name (null if it no longer resolves). */
  resourceName: string | null;
  itemCount: number;
  createdAt: Date;
  receivedAt: Date | null;
}

/**
 * A donor's own donations at platform level (#168): list every intake linked to
 * the authenticated user (`donorUserId`) across all emergencies, newest first,
 * so they can follow their donations from their account without keeping a code.
 * This is identity-scoped (you only ever see your own) — distinct from the
 * operator's code/email search, which exposes third-party PII and stays gated
 * behind `intake:read`.
 */
export class GetMyDonationIntakes {
  constructor(
    private readonly repo: DonationIntakeRepository,
    private readonly resourceLookup: IntakeResourceLookup,
  ) {}

  async execute(donorUserId: string): Promise<MyDonationIntakeView[]> {
    const intakes = await this.repo.findByDonorUserId(donorUserId);

    return Promise.all(
      intakes.map(async (intake) => {
        const snap = intake.toSnapshot();
        const resource = await this.resourceLookup.findForIntake(
          snap.targetResourceId,
        );
        return {
          intakeCode: snap.intakeCode,
          status: snap.status,
          emergencyId: snap.emergencyId,
          emergencySlug: resource?.emergencySlug ?? null,
          resourceName: resource?.name ?? null,
          itemCount: snap.lines.length,
          createdAt: snap.createdAt,
          receivedAt: snap.receivedAt,
        };
      }),
    );
  }
}
