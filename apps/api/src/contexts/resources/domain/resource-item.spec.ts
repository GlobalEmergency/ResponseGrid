import { ResourceItem, ResourceItemValidationError } from './resource-item';

describe('ResourceItem', () => {
  it('creates a valid item and trims the name and category', () => {
    const item = ResourceItem.create({
      name: '  Agua embotellada  ',
      quantity: 100,
      unit: 'litros',
      category: '  water  ',
    });

    expect(item.name).toBe('Agua embotellada');
    expect(item.quantity).toBe(100);
    expect(item.unit).toBe('litros');
    expect(item.category).toBe('water');
  });

  it('defaults unit to null when not provided', () => {
    const item = ResourceItem.create({
      name: 'Mantas',
      quantity: 5,
      unit: null,
      category: 'shelter',
    });

    expect(item.unit).toBeNull();
  });

  it('throws when the name is empty', () => {
    expect(() =>
      ResourceItem.create({
        name: '   ',
        quantity: 1,
        unit: null,
        category: 'food',
      }),
    ).toThrow(ResourceItemValidationError);
  });

  it('throws when the category is empty', () => {
    expect(() =>
      ResourceItem.create({
        name: 'Arroz',
        quantity: 1,
        unit: null,
        category: '   ',
      }),
    ).toThrow(ResourceItemValidationError);
  });

  it.each([0, -3, 1.5])(
    'throws when the quantity is not a positive integer (%p)',
    (quantity) => {
      expect(() =>
        ResourceItem.create({
          name: 'Arroz',
          quantity,
          unit: 'kg',
          category: 'food',
        }),
      ).toThrow(ResourceItemValidationError);
    },
  );

  it('round-trips through a snapshot', () => {
    const item = ResourceItem.create({
      name: 'Pañales',
      quantity: 30,
      unit: 'paquetes',
      category: 'hygiene',
    });

    const restored = ResourceItem.fromSnapshot(item.toSnapshot());

    expect(restored.toSnapshot()).toEqual(item.toSnapshot());
  });
});
