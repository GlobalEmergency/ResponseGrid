import { receiveDonationHandler } from './donation-received.handler';
import { ReceiveDonationIntoInventory } from '../application/receive-donation-into-inventory';
import { InMemoryResourceRepository } from './in-memory-resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType } from '../domain/resource-enums';
import { Location } from '../../../shared/domain/location';
import { Category } from '@globalemergency/warehouse-core/kernel';
import { DomainEventEnvelope } from '../../../shared/events/fan-out';

const EMG = '11111111-1111-4111-8111-111111111111';

const buildRepoWithResource = async (id: ResourceId) => {
  const repo = new InMemoryResourceRepository();
  await repo.save(
    Resource.register({
      id,
      emergencyId: EmergencyId.fromString(EMG),
      type: ResourceType.Warehouse,
      name: 'Acopio',
      location: Location.create({ address: 'X', latitude: 1, longitude: 2 }),
      ownerUserId: 'u1',
      items: [],
    }),
  );
  return repo;
};

const event = (payload: Record<string, unknown>): DomainEventEnvelope => ({
  name: 'donation_intake.received',
  occurredOn: '2026-07-01T00:00:00.000Z',
  aggregateId: 'intake-1',
  payload,
});

describe('receiveDonationHandler', () => {
  it('applies the event lines to the target resource inventory', async () => {
    const id = ResourceId.create();
    const repo = await buildRepoWithResource(id);
    const handler = receiveDonationHandler(
      new ReceiveDonationIntoInventory(repo),
    );

    await handler(
      event({
        targetResourceId: id.value,
        lines: [
          {
            name: 'Agua',
            quantity: 6,
            unit: 'l',
            category: Category.Water,
            presentation: null,
          },
        ],
      }),
    );

    const saved = await repo.findById(id);
    expect(saved?.items.map((i) => i.toSnapshot())).toEqual([
      expect.objectContaining({ name: 'Agua', quantity: 6 }),
    ]);
  });

  it('ignores a malformed payload without touching inventory', async () => {
    const id = ResourceId.create();
    const repo = await buildRepoWithResource(id);
    const handler = receiveDonationHandler(
      new ReceiveDonationIntoInventory(repo),
    );

    await handler(event({ targetResourceId: id.value, lines: 'not-an-array' }));

    const saved = await repo.findById(id);
    expect(saved?.items).toEqual([]);
  });
});
