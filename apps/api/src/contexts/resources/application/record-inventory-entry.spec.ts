import { RecordInventoryEntry } from './record-inventory-entry';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType, ResourceStage } from '../domain/resource-enums';
import { Category } from '../../supplies/domain/category';
import { ResourceNotFoundError } from './resource-not-found.error';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = {
  address: 'Gran Vía 44, Madrid',
  latitude: 40.4201,
  longitude: -3.7057,
};
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

async function seedPoint(
  repo: InMemoryResourceRepository,
  bus: FakeEventBus,
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: EM,
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name: 'Acopio CDMX',
    location: baseLocation,
    ownerUserId: 'op-1',
  });
  return id;
}

const line = (name: string, quantity: number) => ({
  name,
  quantity,
  unit: 'cajas' as string | null,
  category: Category.Water,
  presentation: null,
});

describe('RecordInventoryEntry', () => {
  it('adds lines to a point stock', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await seedPoint(repo, bus);

    await new RecordInventoryEntry(repo).execute({
      resourceId: id,
      lines: [line('Agua', 10)],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].quantity).toBe(10);
  });

  it('merges into the existing stock line across entries (sums quantities)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await seedPoint(repo, bus);
    const useCase = new RecordInventoryEntry(repo);

    await useCase.execute({ resourceId: id, lines: [line('Agua', 10)] });
    await useCase.execute({ resourceId: id, lines: [line('Agua', 5)] });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].quantity).toBe(15);
  });

  it('throws ResourceNotFoundError for an unknown resource', async () => {
    const repo = new InMemoryResourceRepository();

    await expect(
      new RecordInventoryEntry(repo).execute({
        resourceId: '99999999-9999-4999-8999-999999999999',
        lines: [line('Agua', 1)],
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
