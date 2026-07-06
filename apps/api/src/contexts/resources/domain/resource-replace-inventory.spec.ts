import { Resource } from './resource';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
import { ResourceId } from './resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType } from './resource-enums';
import { Location } from '../../../shared/domain/location';

const make = (items: SupplyLine[] = []): Resource =>
  Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString('11111111-1111-4111-8111-111111111111'),
    type: ResourceType.Warehouse,
    name: 'Acopio Centro',
    location: Location.create({ address: 'X', latitude: 1, longitude: 2 }),
    ownerUserId: 'user-1',
    items,
  });

const line = (name: string, quantity: number): SupplyLine =>
  SupplyLine.create({ name, quantity, unit: 'l', category: Category.Water });

describe('Resource.replaceInventory', () => {
  it('overwrites the whole inventory (does not merge)', () => {
    const r = make([line('Agua', 10)]);
    r.replaceInventory([line('Arroz', 3)]);
    expect(r.items.map((i) => i.name)).toEqual(['Arroz']);
  });

  it('clears inventory when given an empty list', () => {
    const r = make([line('Agua', 10)]);
    r.replaceInventory([]);
    expect(r.items).toHaveLength(0);
  });

  it('reflects the replacement in the snapshot', () => {
    const r = make([line('Agua', 10)]);
    r.replaceInventory([line('Mantas', 5)]);
    expect(r.toSnapshot().items).toHaveLength(1);
    expect(r.toSnapshot().items[0]).toMatchObject({
      name: 'Mantas',
      quantity: 5,
    });
  });

  // #294: PUT /resources/:id/inventory needs a counter to detect a concurrent
  // merge (receiveInventory) that happened between the form load and the save.
  it('bumps inventoryVersion on every replace', () => {
    const r = make([line('Agua', 10)]);
    expect(r.inventoryVersion).toBe(0);
    r.replaceInventory([line('Arroz', 3)]);
    expect(r.inventoryVersion).toBe(1);
    r.replaceInventory([]);
    expect(r.inventoryVersion).toBe(2);
  });
});
