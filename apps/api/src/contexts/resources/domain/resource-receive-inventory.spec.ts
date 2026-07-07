import { Resource } from './resource';
import { SupplyLine, Category } from '@globalemergency/warehouse-core/kernel';
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

const line = (
  name: string,
  quantity: number,
  unit: string | null = null,
  category: Category = Category.Water,
  presentation: string | null = null,
): SupplyLine =>
  SupplyLine.create({ name, quantity, unit, category, presentation });

describe('Resource.receiveInventory', () => {
  it('sums quantities of lines with the same name + category + unit', () => {
    const r = make([line('Agua', 10, 'l')]);
    r.receiveInventory([line('Agua', 5, 'l')]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].toSnapshot()).toMatchObject({
      name: 'Agua',
      quantity: 15,
      unit: 'l',
    });
  });

  it('appends genuinely new lines, keeping existing ones first', () => {
    const r = make([line('Agua', 10, 'l')]);
    r.receiveInventory([line('Arroz', 3, 'kg', Category.Food)]);
    expect(r.items.map((i) => i.name)).toEqual(['Agua', 'Arroz']);
  });

  it('keeps lines distinct when unit or category differ', () => {
    const r = make([line('Agua', 10, 'l')]);
    r.receiveInventory([
      line('Agua', 4, 'cajas'), // different unit
      line('Agua', 2, 'l', Category.Other), // different category
    ]);
    expect(r.items).toHaveLength(3);
  });

  it('merges medical lines only when the presentation matches', () => {
    const r = make([line('Suero', 5, null, Category.MedicalSupplies, 'EV')]);
    r.receiveInventory([
      line('Suero', 3, null, Category.MedicalSupplies, 'EV'), // merges → 8
      line('Suero', 7, null, Category.MedicalSupplies, 'ampolla'), // distinct
    ]);
    expect(r.items).toHaveLength(2);
    expect(r.items.find((i) => i.presentation === 'EV')?.quantity).toBe(8);
    expect(r.items.find((i) => i.presentation === 'ampolla')?.quantity).toBe(7);
  });

  it('keeps a new line expiresAt and supplyId (manual entry with freshness date)', () => {
    const r = make();
    r.receiveInventory([
      SupplyLine.create({
        name: 'Leche',
        quantity: 10,
        unit: 'l',
        category: Category.Food,
        supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
        expiresAt: '2026-08-01',
      }),
    ]);
    expect(r.items[0].toSnapshot()).toMatchObject({
      supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
      expiresAt: '2026-08-01',
    });
  });

  it('a merge never erases the stored expiresAt and keeps the earliest date', () => {
    const r = make([
      SupplyLine.create({
        name: 'Leche',
        quantity: 10,
        unit: 'l',
        category: Category.Food,
        expiresAt: '2026-07-15',
      }),
    ]);
    // Incoming without a date: the owner-declared date must survive.
    r.receiveInventory([line('Leche', 5, 'l', Category.Food)]);
    expect(r.items[0].toSnapshot()).toMatchObject({
      quantity: 15,
      expiresAt: '2026-07-15',
    });
    // Incoming with an EARLIER date: merged stock is as fresh as its oldest batch.
    r.receiveInventory([
      SupplyLine.create({
        name: 'Leche',
        quantity: 2,
        unit: 'l',
        category: Category.Food,
        expiresAt: '2026-07-01',
      }),
    ]);
    expect(r.items[0].toSnapshot()).toMatchObject({
      quantity: 17,
      expiresAt: '2026-07-01',
    });
  });

  it('a merge keeps the existing supplyId soft link', () => {
    const r = make([
      SupplyLine.create({
        name: 'Agua',
        quantity: 10,
        unit: 'l',
        category: Category.Water,
        supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
      }),
    ]);
    r.receiveInventory([line('Agua', 5, 'l')]);
    expect(r.items[0].toSnapshot()).toMatchObject({
      quantity: 15,
      supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
    });
  });

  it('is a no-op for an empty list', () => {
    const r = make([line('Agua', 10, 'l')]);
    r.receiveInventory([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].quantity).toBe(10);
  });

  it('adds to an empty inventory', () => {
    const r = make();
    r.receiveInventory([line('Mantas', 20, 'unidades', Category.Shelter)]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].toSnapshot()).toMatchObject({
      name: 'Mantas',
      quantity: 20,
    });
  });
});
