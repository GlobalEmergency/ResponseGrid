import { ReceiveDonationIntoInventory } from './receive-donation-into-inventory';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { Resource } from '../domain/resource';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType, ResourceStage } from '../domain/resource-enums';
import { Location } from '../../../shared/domain/location';

const EMG = '11111111-1111-4111-8111-111111111111';

const buildResource = (id: ResourceId, items: SupplyLine[] = []): Resource =>
  Resource.register({
    id,
    emergencyId: EmergencyId.fromString(EMG),
    type: ResourceType.Warehouse,
    stage: ResourceStage.Origin,
    name: 'Acopio',
    location: Location.create({ address: 'X', latitude: 1, longitude: 2 }),
    ownerUserId: 'u1',
    items,
  });

describe('ReceiveDonationIntoInventory', () => {
  it('merges received lines into the target inventory and persists', async () => {
    const repo = new InMemoryResourceRepository();
    const id = ResourceId.create();
    await repo.save(
      buildResource(id, [
        SupplyLine.create({
          name: 'Agua',
          quantity: 10,
          unit: 'l',
          category: Category.Water,
        }),
      ]),
    );

    const useCase = new ReceiveDonationIntoInventory(repo);
    const result = await useCase.execute({
      targetResourceId: id.value,
      lines: [
        {
          name: 'Agua',
          quantity: 5,
          unit: 'l',
          category: Category.Water,
          presentation: null,
        },
        {
          name: 'Arroz',
          quantity: 3,
          unit: 'kg',
          category: Category.Food,
          presentation: null,
        },
      ],
    });

    expect(result).toBe('applied');
    const updated = await repo.findById(id);
    const byName = new Map(updated!.items.map((i) => [i.name, i.quantity]));
    expect(byName.get('Agua')).toBe(15);
    expect(byName.get('Arroz')).toBe(3);
  });

  it('returns resource_not_found when the target does not exist (no throw)', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new ReceiveDonationIntoInventory(repo);

    const result = await useCase.execute({
      targetResourceId: ResourceId.create().value,
      lines: [
        {
          name: 'Agua',
          quantity: 1,
          unit: null,
          category: Category.Water,
          presentation: null,
        },
      ],
    });

    expect(result).toBe('resource_not_found');
  });
});
