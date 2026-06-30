import { Supply, SupplyValidationError, formatSupplyCode } from './supply';

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

  describe('mutadores (edición admin, #222)', () => {
    const base = () =>
      Supply.create({
        id: '11111111-1111-4111-8111-111111111111',
        code: 'INS-0001',
        name: 'Agua potable',
        categorySlug: 'water',
        defaultUnit: 'litros',
      });

    it('rename/recategorize/setDefaultUnit conservan id y code y son inmutables', () => {
      const original = base();
      const edited = original
        .rename('  Agua mineral  ')
        .recategorize('food')
        .setDefaultUnit(null);

      expect(edited).not.toBe(original);
      expect(original.name).toBe('Agua potable'); // original sin tocar
      expect(edited.id).toBe(original.id);
      expect(edited.code).toBe('INS-0001');
      expect(edited.name).toBe('Agua mineral'); // recorta
      expect(edited.categorySlug).toBe('food');
      expect(edited.defaultUnit).toBeNull();
    });

    it('rename re-aplica las invariantes (nombre vacío rechazado)', () => {
      expect(() => base().rename('   ')).toThrow(SupplyValidationError);
    });

    it('setVariantOf, setAttributes y setRegistrationNotes', () => {
      const edited = base()
        .setVariantOf('22222222-2222-4222-8222-222222222222')
        .setAttributes({ size: 'M' })
        .setRegistrationNotes('  nota  ');
      expect(edited.variantOfId).toBe('22222222-2222-4222-8222-222222222222');
      expect(edited.attributes).toEqual({ size: 'M' });
      expect(edited.registrationNotes).toBe('nota');
    });

    it('archive y restore alternan el estado', () => {
      const archived = base().archive();
      expect(archived.status).toBe('archived');
      expect(archived.restore().status).toBe('active');
    });
  });

  describe('formatSupplyCode', () => {
    it('rellena a 4 dígitos en formato XXX-NNNN', () => {
      expect(formatSupplyCode('INS', 1)).toBe('INS-0001');
      expect(formatSupplyCode('WAT', 212)).toBe('WAT-0212');
      expect(formatSupplyCode('FOD', 9999)).toBe('FOD-9999');
    });

    it('produce un código válido para el agregado', () => {
      const supply = Supply.create({
        id: '11111111-1111-4111-8111-111111111111',
        code: formatSupplyCode('INS', 212),
        name: 'Nuevo insumo',
        categorySlug: 'other',
        defaultUnit: null,
      });
      expect(supply.code).toBe('INS-0212');
    });

    it('rechaza secuencias no positivas', () => {
      expect(() => formatSupplyCode('INS', 0)).toThrow(SupplyValidationError);
      expect(() => formatSupplyCode('INS', -3)).toThrow(SupplyValidationError);
    });

    it('rechaza prefijos que no son de 3 letras mayúsculas', () => {
      expect(() => formatSupplyCode('IN', 5)).toThrow(SupplyValidationError);
      expect(() => formatSupplyCode('INSS', 5)).toThrow(SupplyValidationError);
      expect(() => formatSupplyCode('ins', 5)).toThrow(SupplyValidationError);
    });
  });
});
