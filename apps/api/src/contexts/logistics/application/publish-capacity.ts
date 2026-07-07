import { TransportCapacityRepository } from '@globalemergency/warehouse-core/logistics';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import {
  TransportMode,
  TransportProviderType,
} from '@globalemergency/warehouse-core/logistics';
import { Capacity } from '@globalemergency/warehouse-core/logistics';
import {
  Coverage,
  CoverageProps,
} from '@globalemergency/warehouse-core/logistics';
import { CapacityWindow } from '@globalemergency/warehouse-core/logistics';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export interface PublishCapacityCommand {
  emergencyId: string;
  provider: { type: TransportProviderType; id: string };
  mode: TransportMode;
  capacity: { weightKg: number | null; volumeM3: number | null };
  coverage: CoverageProps;
  window: { from: string | null; to: string | null };
  constraints: string[];
  notes: string | null;
}

export class PublishCapacity {
  constructor(
    private readonly repo: TransportCapacityRepository,
    private readonly emergencyStatusReader: LogisticsEmergencyStatusReader,
  ) {}

  async execute(cmd: PublishCapacityCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    const capacity = TransportCapacity.publish({
      id: TransportCapacityId.create(),
      scopeId: ScopeId.fromString(cmd.emergencyId),
      provider: cmd.provider,
      mode: cmd.mode,
      capacity: Capacity.create(cmd.capacity),
      coverage: Coverage.fromPlain(cmd.coverage),
      window: CapacityWindow.create(cmd.window),
      constraints: cmd.constraints,
      notes: cmd.notes,
    });

    await this.repo.save(capacity);
    return { id: capacity.id.value };
  }
}
