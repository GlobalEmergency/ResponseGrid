import { Category } from './category';
import { Supply, SupplyValidationError } from './supply';

describe('Supply', () => {
  it('crea un supply valido y recorta los textos', () => {
    const supply = Supply.create({
      id: ' 11111111-1111-4111-8111-111111111111 ',
      code: ' INS-0001 ',
      name: '  Agua potable  ',
      category: Category.Water,
      defaultUnit: ' litros ',
      attributes: { presentation: 'botella' },
    });

    expect(supply.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(supply.code).toBe('INS-0001');
    expect(supply.name).toBe('Agua potable');
    expect(supply.defaultUnit).toBe('litros');
    expect(supply.attributes).toEqual({ presentation: 'botella' });
  });

  it.each(['INS-1', 'ins-0001', '0001'])(
    'rechaza codigos invalidos (%p)',
    (code) => {
      expect(() =>
        Supply.create({
          id: '11111111-1111-4111-8111-111111111111',
          code,
          name: 'Arroz',
          category: Category.Food,
          defaultUnit: 'kg',
        }),
      ).toThrow(SupplyValidationError);
    },
  );

  it('rechaza el nombre vacio', () => {
    expect(() =>
      Supply.create({
        id: '11111111-1111-4111-8111-111111111111',
        code: 'INS-0002',
        name: '   ',
        category: Category.Food,
        defaultUnit: 'kg',
      }),
    ).toThrow(SupplyValidationError);
  });

  it('acepta variantes y preserva el parent id', () => {
    const supply = Supply.create({
      id: '11111111-1111-4111-8111-111111111111',
      code: 'INS-0003',
      name: 'Panal talla M',
      category: Category.Other,
      defaultUnit: 'unidad',
      variantOfId: '22222222-2222-4222-8222-222222222222',
      attributes: { size: 'M' },
    });

    expect(supply.variantOfId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('round-trips through snapshot sin perder datos', () => {
    const supply = Supply.create({
      id: '11111111-1111-4111-8111-111111111111',
      code: 'INS-0004',
      name: 'Manta',
      category: Category.Shelter,
      defaultUnit: 'unidad',
      attributes: {
        color: 'gris',
        packaging: { type: 'folded' },
      },
      variantOfId: null,
    });

    const restored = Supply.fromSnapshot(supply.toSnapshot());

    expect(restored.toSnapshot()).toEqual(supply.toSnapshot());
  });
});
