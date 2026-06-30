import { SuppliesController } from './supplies.controller';
import { PublicSupplyRecord } from '../../domain/ports/supply-catalog.read-model';

describe('SuppliesController', () => {
  const record: PublicSupplyRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'WAT-0001',
    nameEs: 'Agua potable',
    nameEn: 'Drinking water',
    categorySlug: 'water',
    categoryLabelEs: 'Agua',
    categoryLabelEn: 'Water',
    defaultUnit: 'und',
    attributes: { size: '18L' },
    variantOfId: null,
    aliases: ['agua embotellada'],
  };

  it('localiza la salida del autocomplete segun la locale', async () => {
    const controller = new SuppliesController(
      {
        execute: () => Promise.resolve([record]),
      } as never,
      {
        execute: () => Promise.resolve(record),
      } as never,
    );

    const [listItem, detailItem] = await Promise.all([
      controller.list(
        { q: 'agua', locale: 'en', limit: 20, offset: 0 },
        { 'accept-language': 'en-US' },
      ),
      controller.get(record.id, 'es', { 'accept-language': 'es-VE' }),
    ]);

    expect(listItem[0]?.name).toBe('Drinking water');
    expect(listItem[0]?.categoryLabel).toBe('Water');
    expect(listItem[0]?.aliases).toEqual(['agua embotellada']);
    expect(detailItem.name).toBe('Agua potable');
    expect(detailItem.categoryLabel).toBe('Agua');
  });
});
