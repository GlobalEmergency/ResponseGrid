import { PublishCapacity } from './publish-capacity';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '../domain/transport-capacity-enums';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { CapacityMustHaveWeightOrVolumeError } from '../domain/transport-capacity-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  constructor(private status: string | null) {}
  getStatus(): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

function baseCmd() {
  return {
    emergencyId: EM,
    provider: {
      type: TransportProviderType.Volunteer,
      id: PROVIDER_ID,
    },
    mode: TransportMode.Road,
    capacity: { weightKg: 1500, volumeM3: null },
    coverage: {
      kind: 'area' as const,
      area: 'Caracas',
    },
    window: { from: null, to: null },
    constraints: ['refrigerated'],
    notes: null,
  };
}

describe('PublishCapacity', () => {
  it('publishes a capacity when the emergency is active', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader('active'));

    const { id } = await useCase.execute(baseCmd());

    const saved = await repo.findById(TransportCapacityId.fromString(id));
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(TransportCapacityStatus.Available);
    expect(saved!.capacity.weightKg).toBe(1500);
    expect(saved!.coverage.kind).toBe('area');
  });

  it('rejects publishing to a paused emergency', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader('paused'));

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('rejects publishing to a non-existent emergency', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader(null));

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('propagates the domain invariant when capacity is empty', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader('active'));

    await expect(
      useCase.execute({
        ...baseCmd(),
        capacity: { weightKg: null, volumeM3: null },
      }),
    ).rejects.toThrow(CapacityMustHaveWeightOrVolumeError);
  });
});
