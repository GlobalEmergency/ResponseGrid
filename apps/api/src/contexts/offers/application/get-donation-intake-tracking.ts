import { EmergencyId } from '../../../shared/domain/emergency-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { IntakeResourceLookup } from '../domain/ports/intake-resource-lookup';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

export interface DonationIntakeTrackingLine {
  name: string;
  quantity: number;
  unit: string | null;
  /** Slug de categoría (data-driven). */
  category: string;
  supplyId: string | null;
  presentation: string | null;
}

export interface DonationIntakeTracking {
  intakeCode: string;
  status: string;
  /** Name of the destination collection point (null if it no longer resolves). */
  resourceName: string | null;
  createdAt: Date;
  receivedAt: Date | null;
  updatedAt: Date;
  lines: DonationIntakeTrackingLine[];
}

/**
 * Public donor tracking (#168): resolve a donation intake by its short code so
 * the donor can follow its status without logging in. Returns the status, dates,
 * destination point name and the donor's own declared lines — but NO third-party
 * PII (no donor name/contact). Unknown code → not found (404). Throttled at the
 * controller against code enumeration.
 */
export class GetDonationIntakeTracking {
  constructor(
    private readonly repo: DonationIntakeRepository,
    private readonly resourceLookup: IntakeResourceLookup,
  ) {}

  async execute(
    emergencyId: string,
    code: string,
  ): Promise<DonationIntakeTracking> {
    const intake = await this.repo.findByEmergencyAndCode(
      EmergencyId.fromString(emergencyId),
      code.trim(),
    );
    if (!intake) throw new DonationIntakeNotFoundError(code);

    const snap = intake.toSnapshot();
    const resource = await this.resourceLookup.findForIntake(
      snap.targetResourceId,
    );

    return {
      intakeCode: snap.intakeCode,
      status: snap.status,
      resourceName: resource?.name ?? null,
      createdAt: snap.createdAt,
      receivedAt: snap.receivedAt,
      updatedAt: snap.updatedAt,
      lines: snap.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        category: line.category,
        supplyId: line.supplyId ?? null,
        presentation: line.presentation ?? null,
      })),
    };
  }
}
