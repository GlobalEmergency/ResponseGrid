import { ListSupplies } from './list-supplies';
import {
  SupplyCatalogRecord,
  SupplyRepository,
} from '../domain/ports/supply.repository';

describe('ListSupplies', () => {
  const catalog: SupplyCatalogRecord[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'INS-0001',
      nameEs: 'Agua potable',
      nameEn: 'Drinking water',
      categorySlug: 'food',
      categoryLabelEs: 'Alimentos',
      categoryLabelEn: 'Food',
      defaultUnit: 'und',
      attributes: {},
      variantOfId: null,
      status: 'active',
      registrationNotes: null,
      aliases: ['agua embotellada'],
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'INS-0002',
      nameEs: 'Panal',
      nameEn: null,
      categorySlug: 'hygiene',
      categoryLabelEs: 'Higiene',
      categoryLabelEn: 'Hygiene',
      defaultUnit: 'und',
      attributes: {},
      variantOfId: null,
      status: 'active',
      registrationNotes: null,
      aliases: ['advil'],
    },
  ];

  function repo(): SupplyRepository {
    return {
      loadCatalog: () => Promise.resolve(catalog),
    };
  }

  it('resuelve un alias exacto y pone ese insumo primero', async () => {
    const result = await new ListSupplies(repo()).execute({
      q: 'advil',
      locale: 'en',
      limit: 20,
      offset: 0,
    });

    expect(result[0]?.id).toBe(catalog[1].id);
  });

  it('filtra por categoria y pagina el resultado', async () => {
    const result = await new ListSupplies(repo()).execute({
      categorySlug: 'food',
      locale: 'es',
      limit: 1,
      offset: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(catalog[0].id);
  });
});
