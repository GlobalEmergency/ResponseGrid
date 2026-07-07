import { CachingSupplyCatalogReadModel } from './caching-supply-catalog.read-model';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '@globalemergency/warehouse-core/catalog';

describe('CachingSupplyCatalogReadModel', () => {
  const record: PublicSupplyRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'WAT-0001',
    name: 'Agua potable',
    translations: { en: 'Drinking water' },
    categorySlug: 'water',
    categoryLabel: 'Agua',
    categoryTranslations: { es: 'Agua', en: 'Water' },
    defaultUnit: 'und',
    attributes: {},
    variantOfId: null,
    aliases: [],
  };

  function fakeInner(): {
    readModel: SupplyCatalogReadModel;
    calls: () => number;
  } {
    let calls = 0;
    return {
      calls: () => calls,
      readModel: {
        listActive: () => {
          calls += 1;
          return Promise.resolve([record]);
        },
      },
    };
  }

  it('sirve listActive desde caché dentro del TTL', async () => {
    let clock = 1000;
    const inner = fakeInner();
    const cache = new CachingSupplyCatalogReadModel(
      inner.readModel,
      60_000,
      () => clock,
    );

    await cache.listActive();
    clock += 30_000;
    await cache.listActive();

    expect(inner.calls()).toBe(1);
  });

  it('recarga cuando el TTL expira', async () => {
    let clock = 1000;
    const inner = fakeInner();
    const cache = new CachingSupplyCatalogReadModel(
      inner.readModel,
      100,
      () => clock,
    );

    await cache.listActive();
    clock += 200;
    await cache.listActive();

    expect(inner.calls()).toBe(2);
  });

  it('dedupe cargas concurrentes (sin estampida)', async () => {
    const clock = 1000;
    const inner = fakeInner();
    const cache = new CachingSupplyCatalogReadModel(
      inner.readModel,
      60_000,
      () => clock,
    );

    await Promise.all([cache.listActive(), cache.listActive()]);

    expect(inner.calls()).toBe(1);
  });
});
