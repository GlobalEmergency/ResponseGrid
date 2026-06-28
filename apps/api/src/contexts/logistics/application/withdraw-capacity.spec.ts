import { WithdrawCapacity } from './withdraw-capacity';
import { CapacityNotFoundError } from './capacity-not-found.error';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { TransportCapacity } from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from '../domain/transport-capacity-enums';

const EM = '44444444-4444-4444-8444-444444444444';

function make(): TransportCapacity {
  return TransportCapacity.create({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    providerType: ProviderType.Organization,
    providerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    mode: TransportMode.Sea,
    weightKg: 20000,
    volumeM3: null,
    originMunicipality: 'La Guaira',
    destinationMunicipality: 'Valencia',
    availableFrom: new Date('2026-07-01T00:00:00.000Z'),
    availableUntil: null,
    refrigerated: false,
    notes: null,
  });
}

describe('WithdrawCapacity', () => {
  it('withdraws an existing capacity', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const cap = make();
    await repo.save(cap);
    const useCase = new WithdrawCapacity(repo);

    await useCase.execute({ capacityId: cap.id.value });

    const found = await repo.findById(cap.id);
    expect(found!.status).toBe(CapacityStatus.Withdrawn);
  });

  it('throws when the capacity does not exist', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new WithdrawCapacity(repo);

    await expect(
      useCase.execute({ capacityId: '11111111-1111-4111-8111-111111111111' }),
    ).rejects.toThrow(CapacityNotFoundError);
  });
});
