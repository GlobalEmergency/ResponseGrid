import { TransportCapacityRepository } from '../domain/ports/transport-capacity.repository';
import { EmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { TransportCapacity } from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportMode,
  ProviderType,
} from '../domain/transport-capacity-enums';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export interface PublishCapacityCommand {
  emergencyId: string;
  providerType: ProviderType;
  providerId: string;
  mode: TransportMode;
  weightKg: number | null;
  volumeM3: number | null;
  originMunicipality: string;
  destinationMunicipality: string | null;
  availableFrom: Date;
  availableUntil: Date | null;
  refrigerated: boolean;
  notes: string | null;
}

export class PublishCapacity {
  constructor(
    private readonly repo: TransportCapacityRepository,
    private readonly emergencyStatusReader: EmergencyStatusReader,
  ) {}

  async execute(cmd: PublishCapacityCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    const capacity = TransportCapacity.create({
      id: TransportCapacityId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      providerType: cmd.providerType,
      providerId: cmd.providerId,
      mode: cmd.mode,
      weightKg: cmd.weightKg,
      volumeM3: cmd.volumeM3,
      originMunicipality: cmd.originMunicipality,
      destinationMunicipality: cmd.destinationMunicipality,
      availableFrom: cmd.availableFrom,
      availableUntil: cmd.availableUntil,
      refrigerated: cmd.refrigerated,
      notes: cmd.notes,
    });

    await this.repo.save(capacity);
    return { id: capacity.id.value };
  }
}
