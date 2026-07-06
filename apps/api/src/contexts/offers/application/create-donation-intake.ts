import { EmergencyId } from '../../../shared/domain/emergency-id';
import { DonationIntake, generateIntakeCode } from '../domain/donation-intake';
import { DonationIntakeId } from '../domain/donation-intake-id';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { IntakeResourceLookup } from '../domain/ports/intake-resource-lookup';
import { DonorAccountPort } from '../domain/ports/donor-account.port';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { SupplyLineProps } from '@globalemergency/warehouse-core/kernel';
import {
  INTAKE_ACTIVE_STATUS,
  resolveIntakeTargetResource,
} from './resolve-intake-target-resource';

export interface CreateDonationIntakeCommand {
  emergencyId: string;
  targetResourceId: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorUserId: string | null;
  items: SupplyLineProps[];
}

export class CreateDonationIntake {
  constructor(
    private readonly repo: DonationIntakeRepository,
    private readonly emergencyStatusReader: OfferEmergencyStatusReader,
    private readonly resourceLookup: IntakeResourceLookup,
    /**
     * Optional: when present and the donor is not already linked to a user but
     * left an email, a passwordless profile is created/resolved so the donation
     * shows up under "Mis donaciones" (#168). Omitted in tests that don't
     * exercise account linking.
     */
    private readonly donorAccount?: DonorAccountPort,
  ) {}

  async execute(
    cmd: CreateDonationIntakeCommand,
  ): Promise<{ id: string; intakeCode: string; status: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== INTAKE_ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    await resolveIntakeTargetResource(
      this.resourceLookup,
      cmd.targetResourceId,
      cmd.emergencyId,
    );

    const emergencyId = EmergencyId.fromString(cmd.emergencyId);
    const intakeCode = await this.allocateCode(emergencyId);

    // Link the donation to a platform profile (#168). If the donor is already
    // authenticated we keep their user id; otherwise, when they left an email,
    // resolve-or-create a passwordless profile so it appears in "Mis donaciones".
    let donorUserId = cmd.donorUserId;
    if (!donorUserId && cmd.donorEmail && this.donorAccount) {
      donorUserId = await this.donorAccount.ensureByContact({
        email: cmd.donorEmail,
        name: cmd.donorName,
        phone: cmd.donorPhone,
      });
    }

    const intake = DonationIntake.create({
      id: DonationIntakeId.create(),
      emergencyId,
      targetResourceId: cmd.targetResourceId,
      intakeCode,
      donor: {
        donorName: cmd.donorName,
        donorPhone: cmd.donorPhone,
        donorEmail: cmd.donorEmail,
      },
      donorUserId,
      lines: cmd.items.map((item, index) => ({
        sortOrder: index,
        line: item,
      })),
    });

    await this.repo.save(intake);

    return {
      id: intake.id.value,
      intakeCode: intake.intakeCode,
      status: intake.status,
    };
  }

  private async allocateCode(emergencyId: EmergencyId): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateIntakeCode();
      const exists = await this.repo.existsCode(emergencyId, code);
      if (!exists) return code;
    }
    throw new Error('Failed to allocate unique intake code');
  }
}
