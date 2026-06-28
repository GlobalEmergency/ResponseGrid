import { ListCapacities } from './list-capacities';
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

function make(mode: TransportMode): TransportCapacity {
  return TransportCapacity.create({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    providerType: ProviderType.Volunteer,
    providerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    mode,
    weightKg: 100,
    volumeM3: null,
    originMunicipality: 'Valencia',
    destinationMunicipality: null,
    availableFrom: new Date('2026-07-01T00:00:00.000Z'),
    availableUntil: null,
    refrigerated: false,
    notes: null,
  });
}

describe('ListCapacities', () => {
  it('lists capacities for an emergency as serializable views, filterable by mode', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    await repo.save(make(TransportMode.Road));
    await repo.save(make(TransportMode.Air));
    const useCase = new ListCapacities(repo);

    const all = await useCase.execute({ emergencyId: EM });
    expect(all).toHaveLength(2);
    expect(typeof all[0].availableFrom).toBe('string');

    const road = await useCase.execute({
      emergencyId: EM,
      mode: TransportMode.Road,
    });
    expect(road).toHaveLength(1);
    expect(road[0].mode).toBe(TransportMode.Road);
  });

  it('filters by status', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const road = make(TransportMode.Road);
    const air = make(TransportMode.Air);
    air.withdraw();
    await repo.save(road);
    await repo.save(air);
    const useCase = new ListCapacities(repo);

    const available = await useCase.execute({
      emergencyId: EM,
      status: CapacityStatus.Available,
    });
    expect(available).toHaveLength(1);
    expect(available[0].status).toBe(CapacityStatus.Available);
  });
});
