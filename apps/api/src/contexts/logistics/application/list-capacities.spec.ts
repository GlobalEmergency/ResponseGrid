import { ListCapacities } from './list-capacities';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '@globalemergency/warehouse-core/logistics';
import { Capacity } from '@globalemergency/warehouse-core/logistics';
import { Coverage } from '@globalemergency/warehouse-core/logistics';
import { CapacityWindow } from '@globalemergency/warehouse-core/logistics';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeCapacity(opts: {
  emergencyId?: string;
  mode?: TransportMode;
  window?: CapacityWindow;
  withdrawn?: boolean;
}): TransportCapacity {
  const cap = TransportCapacity.publish({
    id: TransportCapacityId.create(),
    scopeId: ScopeId.fromString(opts.emergencyId ?? EM),
    provider: { type: TransportProviderType.Organization, id: PROVIDER_ID },
    mode: opts.mode ?? TransportMode.Road,
    capacity: Capacity.create({ weightKg: 1000, volumeM3: null }),
    coverage: Coverage.area('Caracas'),
    window: opts.window ?? CapacityWindow.empty(),
    constraints: [],
    notes: null,
  });
  if (opts.withdrawn) cap.withdraw();
  return cap;
}

describe('ListCapacities', () => {
  it('returns only capacities of the requested emergency', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    await repo.save(makeCapacity({ emergencyId: EM }));
    await repo.save(makeCapacity({ emergencyId: OTHER_EM }));
    const useCase = new ListCapacities(repo);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result).toHaveLength(1);
    expect(result[0].emergencyId).toBe(EM);
  });

  it('filters by mode', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    await repo.save(makeCapacity({ mode: TransportMode.Road }));
    await repo.save(makeCapacity({ mode: TransportMode.Air }));
    const useCase = new ListCapacities(repo);

    const result = await useCase.execute({
      emergencyId: EM,
      mode: TransportMode.Air,
    });
    expect(result).toHaveLength(1);
    expect(result[0].mode).toBe(TransportMode.Air);
  });

  it('filters by status', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    await repo.save(makeCapacity({}));
    await repo.save(makeCapacity({ withdrawn: true }));
    const useCase = new ListCapacities(repo);

    const result = await useCase.execute({
      emergencyId: EM,
      status: TransportCapacityStatus.Available,
    });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(TransportCapacityStatus.Available);
  });

  it('filters by window overlap', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    // July window
    await repo.save(
      makeCapacity({
        window: CapacityWindow.create({
          from: '2026-07-01T00:00:00Z',
          to: '2026-07-31T00:00:00Z',
        }),
      }),
    );
    // August window
    await repo.save(
      makeCapacity({
        window: CapacityWindow.create({
          from: '2026-08-01T00:00:00Z',
          to: '2026-08-31T00:00:00Z',
        }),
      }),
    );
    const useCase = new ListCapacities(repo);

    const result = await useCase.execute({
      emergencyId: EM,
      availableFrom: '2026-07-05T00:00:00Z',
      availableTo: '2026-07-10T00:00:00Z',
    });
    expect(result).toHaveLength(1);
    expect(result[0].window.from).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns an empty list when nothing matches', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new ListCapacities(repo);
    const result = await useCase.execute({ emergencyId: EM });
    expect(result).toEqual([]);
  });
});
