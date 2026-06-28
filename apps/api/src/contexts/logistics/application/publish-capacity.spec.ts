import { PublishCapacity, PublishCapacityCommand } from './publish-capacity';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { EmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from '../domain/transport-capacity-enums';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';

const EM = '44444444-4444-4444-8444-444444444444';

class FakeStatusReader implements EmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

function baseCmd(): PublishCapacityCommand {
  return {
    emergencyId: EM,
    providerType: ProviderType.Volunteer,
    providerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    mode: TransportMode.Road,
    weightKg: 800,
    volumeM3: null,
    originMunicipality: 'Valencia',
    destinationMunicipality: null,
    availableFrom: new Date('2026-07-01T00:00:00.000Z'),
    availableUntil: null,
    refrigerated: false,
    notes: null,
  };
}

describe('PublishCapacity', () => {
  it('publishes a capacity for an active emergency and persists it as Available', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader('active'));

    const { id } = await useCase.execute(baseCmd());

    const saved = await repo.findById(TransportCapacityId.fromString(id));
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(CapacityStatus.Available);
    expect(saved!.mode).toBe(TransportMode.Road);

    const all = await repo.findByEmergency(EmergencyId.fromString(EM));
    expect(all).toHaveLength(1);
  });

  it('rejects publishing when the emergency is not active', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new PublishCapacity(repo, new FakeStatusReader('closed'));

    await expect(useCase.execute(baseCmd())).rejects.toThrow();

    const all = await repo.findByEmergency(EmergencyId.fromString(EM));
    expect(all).toHaveLength(0);
  });
});
