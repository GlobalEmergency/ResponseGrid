import {
  WithdrawCapacity,
  CapacityWithdrawUnauthorizedError,
} from './withdraw-capacity';
import { CapacityNotFoundError } from './capacity-not-found.error';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { TransportCapacity } from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '../domain/transport-capacity-enums';
import { Capacity } from '../domain/capacity';
import { Coverage } from '../domain/coverage';
import { CapacityWindow } from '../domain/capacity-window';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makeCapacity(): TransportCapacity {
  return TransportCapacity.publish({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    provider: { type: TransportProviderType.Volunteer, id: OWNER },
    mode: TransportMode.Road,
    capacity: Capacity.create({ weightKg: 1000, volumeM3: null }),
    coverage: Coverage.area('Caracas'),
    window: CapacityWindow.empty(),
    constraints: [],
    notes: null,
  });
}

describe('WithdrawCapacity', () => {
  it('lets the owner withdraw their own capacity', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const cap = makeCapacity();
    await repo.save(cap);
    const useCase = new WithdrawCapacity(repo);

    await useCase.execute({
      capacityId: cap.id.value,
      requesterUserId: OWNER,
      isCoordinator: false,
    });

    const saved = await repo.findById(cap.id);
    expect(saved!.status).toBe(TransportCapacityStatus.Withdrawn);
  });

  it('lets a coordinator withdraw any capacity', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const cap = makeCapacity();
    await repo.save(cap);
    const useCase = new WithdrawCapacity(repo);

    await useCase.execute({
      capacityId: cap.id.value,
      requesterUserId: OTHER,
      isCoordinator: true,
    });

    const saved = await repo.findById(cap.id);
    expect(saved!.status).toBe(TransportCapacityStatus.Withdrawn);
  });

  it('rejects a non-owner non-coordinator', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const cap = makeCapacity();
    await repo.save(cap);
    const useCase = new WithdrawCapacity(repo);

    await expect(
      useCase.execute({
        capacityId: cap.id.value,
        requesterUserId: OTHER,
        isCoordinator: false,
      }),
    ).rejects.toThrow(CapacityWithdrawUnauthorizedError);
  });

  it('throws CapacityNotFoundError for an unknown id', async () => {
    const repo = new InMemoryTransportCapacityRepository();
    const useCase = new WithdrawCapacity(repo);

    await expect(
      useCase.execute({
        capacityId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: OWNER,
        isCoordinator: true,
      }),
    ).rejects.toThrow(CapacityNotFoundError);
  });
});
