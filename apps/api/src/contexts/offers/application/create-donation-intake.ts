import { EmergencyId } from '../../../shared/domain/emergency-id';
import { DonationIntake, generateIntakeCode } from '../domain/donation-intake';
import { DonationIntakeId } from '../domain/donation-intake-id';
import { Category } from '../domain/offer-enums';
import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  IntakeResourceLookup,
  IntakeResourceInfo,
} from '../domain/ports/intake-resource-lookup';
import { InvalidIntakeTargetResourceError } from '../domain/donation-intake-errors';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';
const COLLECTION_TYPES = new Set([
  'collection_point',
  'collection_and_delivery',
]);

export interface CreateDonationIntakeLineCommand {
  category: Category;
  description: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
}

export interface CreateDonationIntakeCommand {
  emergencyId: string;
  targetResourceId: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorUserId: string | null;
  items: CreateDonationIntakeLineCommand[];
}

export class CreateDonationIntake {
  constructor(
    private readonly repo: DonationIntakeRepository,
    private readonly emergencyStatusReader: OfferEmergencyStatusReader,
    private readonly resourceLookup: IntakeResourceLookup,
  ) {}

  async execute(
    cmd: CreateDonationIntakeCommand,
  ): Promise<{ id: string; intakeCode: string; status: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    await this.assertValidTarget(cmd.emergencyId, cmd.targetResourceId);

    const emergencyId = EmergencyId.fromString(cmd.emergencyId);
    const intakeCode = await this.allocateCode(emergencyId);

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
      donorUserId: cmd.donorUserId,
      lines: cmd.items.map((item, index) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        sortOrder: index,
      })),
    });

    await this.repo.save(intake);

    return {
      id: intake.id.value,
      intakeCode: intake.intakeCode,
      status: intake.status,
    };
  }

  private async assertValidTarget(
    emergencyId: string,
    resourceId: string,
  ): Promise<void> {
    const resource = await this.resourceLookup.findForIntake(resourceId);
    if (!resource) {
      throw new InvalidIntakeTargetResourceError(resourceId, 'not found');
    }
    if (resource.emergencyId !== emergencyId) {
      throw new InvalidIntakeTargetResourceError(
        resourceId,
        'belongs to another emergency',
      );
    }
    if (!COLLECTION_TYPES.has(resource.type)) {
      throw new InvalidIntakeTargetResourceError(
        resourceId,
        `type '${resource.type}' is not a collection point`,
      );
    }
    if (resource.publicStatus !== ACTIVE_STATUS) {
      throw new InvalidIntakeTargetResourceError(
        resourceId,
        `public status is '${resource.publicStatus}'`,
      );
    }
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

export function isValidIntakeResource(
  resource: IntakeResourceInfo | null,
  emergencyId: string,
): resource is IntakeResourceInfo {
  if (!resource) return false;
  if (resource.emergencyId !== emergencyId) return false;
  if (!COLLECTION_TYPES.has(resource.type)) return false;
  return resource.publicStatus === ACTIVE_STATUS;
}
