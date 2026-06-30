import { ListSupplies } from './list-supplies';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

describe('ListSupplies', () => {
  const catalog: PublicSupplyRecord[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'WAT-0001',
      nameEs: 'Agua potable',
      nameEn: 'Drinking water',
      categorySlug: 'water',
      categoryLabelEs: 'Agua',
      categoryLabelEn: 'Water',
      defaultUnit: 'und',
      attributes: {},
      variantOfId: null,
      aliases: ['agua embotellada'],
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'HYG-0002',
      nameEs: 'Panal',
      nameEn: null,
      categorySlug: 'hygiene',
      categoryLabelEs: 'Higiene',
      categoryLabelEn: 'Hygiene',
      defaultUnit: 'und',
      attributes: {},
      variantOfId: null,
      aliases: ['advil'],
    },
  ];

  function readModel(): SupplyCatalogReadModel {
    return {
      listActive: () => Promise.resolve(catalog),
    };
  }

  it('resuelve un alias exacto y pone ese insumo primero', async () => {
    const result = await new ListSupplies(readModel()).execute({
      q: 'advil',
      locale: 'en',
      limit: 20,
      offset: 0,
    });

    expect(result[0]?.id).toBe(catalog[1].id);
  });

  it('filtra por categoria y pagina el resultado', async () => {
    const result = await new ListSupplies(readModel()).execute({
      categorySlug: 'water',
      locale: 'es',
      limit: 1,
      offset: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(catalog[0].id);
  });
});
