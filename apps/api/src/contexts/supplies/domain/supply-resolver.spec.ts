import { Supply } from './supply';
import { SupplyAlias } from './supply-alias';
import { SupplyResolver } from './supply-resolver';

describe('SupplyResolver', () => {
  const water = Supply.create({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'WAT-0001',
    name: 'Agua potable',
    categorySlug: 'water',
    defaultUnit: 'litros',
  });
  const diapers = Supply.create({
    id: '22222222-2222-4222-8222-222222222222',
    code: 'OTH-0002',
    name: 'Panal',
    categorySlug: 'other',
    defaultUnit: 'unidad',
  });

  it('resuelve por nombre canonico', () => {
    const resolver = new SupplyResolver([water, diapers]);

    expect(resolver.resolve('  AGUA POTABLE  ')).toBe(water.id);
  });

  it('resuelve por alias normalizado', () => {
    const resolver = new SupplyResolver(
      [water],
      [
        SupplyAlias.create({
          alias: '  Agua embotellada ',
          supplyId: water.id,
        }),
      ],
    );

    expect(resolver.resolve('agua embotellada')).toBe(water.id);
  });

  it('resuelve el codigo canonico tambien', () => {
    const resolver = new SupplyResolver([water]);

    expect(resolver.resolve('wat-0001')).toBe(water.id);
  });

  it('devuelve null para un termino desconocido', () => {
    const resolver = new SupplyResolver([water]);

    expect(resolver.resolve('arbol raro')).toBeNull();
  });

  it('devuelve null cuando una etiqueta es ambigua', () => {
    const resolver = new SupplyResolver(
      [water, diapers],
      [
        SupplyAlias.create({
          alias: 'insumo generico',
          supplyId: water.id,
        }),
        SupplyAlias.create({
          alias: 'insumo generico',
          supplyId: diapers.id,
        }),
      ],
    );

    expect(resolver.resolve('insumo generico')).toBeNull();
  });

  it('resolveMany deduplica resultados', () => {
    const resolver = new SupplyResolver(
      [water, diapers],
      [
        SupplyAlias.create({
          alias: 'agua',
          supplyId: water.id,
        }),
      ],
    );

    expect(resolver.resolveMany(['Agua', 'agua', 'Panal', 'xyz'])).toEqual([
      water.id,
      diapers.id,
    ]);
  });
});
