import { Category } from '@globalemergency/warehouse-core/kernel';
import {
  SupplyLine,
  SupplyLineValidationError,
} from '@globalemergency/warehouse-core/kernel';

describe('SupplyLine', () => {
  it('creates a valid line and trims the name', () => {
    const line = SupplyLine.create({
      name: '  Agua embotellada  ',
      quantity: 100,
      unit: 'litros',
      category: Category.Water,
      supplyId: '  1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8  ',
    });

    expect(line.name).toBe('Agua embotellada');
    expect(line.quantity).toBe(100);
    expect(line.unit).toBe('litros');
    expect(line.category).toBe(Category.Water);
    expect(line.supplyId).toBe('1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8');
    expect(line.presentation).toBeNull();
  });

  it('defaults unit and presentation to null when not provided', () => {
    const line = SupplyLine.create({
      name: 'Mantas',
      quantity: 5,
      unit: null,
      category: Category.Shelter,
    });

    expect(line.unit).toBeNull();
    expect(line.supplyId).toBeNull();
    expect(line.presentation).toBeNull();
  });

  it('keeps the presentation when provided (health vertical, #61)', () => {
    const line = SupplyLine.create({
      name: 'Clindamicina',
      quantity: 10,
      unit: 'amp',
      category: Category.Medicines,
      presentation: 'EV/ampolla',
    });

    expect(line.presentation).toBe('EV/ampolla');
  });

  it('keeps the expiresAt date when provided', () => {
    const line = SupplyLine.create({
      name: 'Yogur',
      quantity: 12,
      unit: 'unidades',
      category: Category.Food,
      expiresAt: '2026-07-01',
    });

    expect(line.expiresAt).toBe('2026-07-01');
  });

  it('throws when expiresAt is not a YYYY-MM-DD date', () => {
    expect(() =>
      SupplyLine.create({
        name: 'Yogur',
        quantity: 12,
        unit: 'unidades',
        category: Category.Food,
        expiresAt: '2026-07-01T12:00:00Z',
      }),
    ).toThrow(SupplyLineValidationError);
  });

  it('throws when expiresAt is not a real calendar date', () => {
    expect(() =>
      SupplyLine.create({
        name: 'Yogur',
        quantity: 12,
        unit: 'unidades',
        category: Category.Food,
        expiresAt: '2026-02-30',
      }),
    ).toThrow(SupplyLineValidationError);
  });

  it('throws when the name is empty', () => {
    expect(() =>
      SupplyLine.create({
        name: '   ',
        quantity: 1,
        unit: null,
        category: Category.Food,
      }),
    ).toThrow(SupplyLineValidationError);
  });

  it.each([0, -3, 1.5])(
    'throws when the quantity is not a positive integer (%p)',
    (quantity) => {
      expect(() =>
        SupplyLine.create({
          name: 'Arroz',
          quantity,
          unit: 'kg',
          category: Category.Food,
        }),
      ).toThrow(SupplyLineValidationError);
    },
  );

  it('round-trips through a snapshot including the soft link', () => {
    const line = SupplyLine.create({
      name: 'Budesonida',
      quantity: 5,
      unit: null,
      category: Category.Medicines,
      supplyId: 'b3f0c6e0-0f51-4f34-8f2d-8d1f3c0c5b50',
      presentation: 'inhalador',
      expiresAt: '2026-07-01',
    });

    const restored = SupplyLine.fromSnapshot(line.toSnapshot());

    expect(restored.toSnapshot()).toEqual(line.toSnapshot());
  });

  it('round-trips a null soft link in snapshots', () => {
    const line = SupplyLine.fromSnapshot({
      name: 'Agua',
      quantity: 1,
      unit: null,
      category: Category.Food,
      supplyId: null,
    });

    expect(line.supplyId).toBeNull();
  });
});
