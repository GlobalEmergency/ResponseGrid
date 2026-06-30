import { Supply, SupplyValidationError } from './supply';

describe('Supply', () => {
  it('crea un supply valido y recorta los textos', () => {
    const supply = Supply.create({
      id: ' 11111111-1111-4111-8111-111111111111 ',
      code: ' WAT-0001 ',
      name: '  Agua potable  ',
      categorySlug: ' water ',
      defaultUnit: ' litros ',
      attributes: { presentation: 'botella' },
    });

    expect(supply.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(supply.code).toBe('WAT-0001');
    expect(supply.name).toBe('Agua potable');
    expect(supply.categorySlug).toBe('water');
    expect(supply.defaultUnit).toBe('litros');
    expect(supply.attributes).toEqual({ presentation: 'botella' });
    expect(supply.status).toBe('active');
    expect(supply.registrationNotes).toBeNull();
  });

  it('acepta estado archived y notas de registro', () => {
    const supply = Supply.create({
      id: '11111111-1111-4111-8111-111111111111',
      code: 'SHE-0005',
      name: 'Manta',
      categorySlug: 'shelter',
      defaultUnit: 'unidad',
      status: 'archived',
      registrationNotes: '  legado UCAB  ',
    });

    expect(supply.status).toBe('archived');
    expect(supply.registrationNotes).toBe('legado UCAB');
  });

  it('round-trips through snapshot sin perder datos', () => {
    const supply = Supply.create({
      id: '11111111-1111-4111-8111-111111111111',
      code: 'SHE-0004',
      name: 'Manta',
      categorySlug: 'shelter',
      defaultUnit: 'unidad',
      attributes: {
        color: 'gris',
        packaging: { type: 'folded' },
      },
      variantOfId: null,
      status: 'active',
      registrationNotes: null,
    });

    const restored = Supply.fromSnapshot(supply.toSnapshot());

    expect(restored.toSnapshot()).toEqual(supply.toSnapshot());
  });

  it('rejects invalid status values', () => {
    expect(() =>
      Supply.create({
        id: '11111111-1111-4111-8111-111111111111',
        code: 'CLO-0003',
        name: 'Ropa',
        categorySlug: 'clothing',
        defaultUnit: null,
        status: 'pending' as never,
      }),
    ).toThrow(SupplyValidationError);
  });
});
