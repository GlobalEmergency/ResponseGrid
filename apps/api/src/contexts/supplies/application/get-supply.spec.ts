import { GetSupply } from './get-supply';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

describe('GetSupply', () => {
  const record: PublicSupplyRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'WAT-0001',
    nameEs: 'Agua potable',
    nameEn: 'Drinking water',
    categorySlug: 'water',
    categoryLabelEs: 'Alimentos',
    categoryLabelEn: 'Food',
    defaultUnit: 'und',
    attributes: {},
    variantOfId: null,
    aliases: [],
  };

  function readModel(): SupplyCatalogReadModel {
    return { listActive: () => Promise.resolve([record]) };
  }

  it('devuelve el insumo activo por id', async () => {
    const result = await new GetSupply(readModel()).execute(record.id);
    expect(result?.id).toBe(record.id);
  });

  it('devuelve null cuando no existe (o no está activo)', async () => {
    const result = await new GetSupply(readModel()).execute(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(result).toBeNull();
  });
});
