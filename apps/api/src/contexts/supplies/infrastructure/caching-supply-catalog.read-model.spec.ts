import { CachingSupplyCatalogReadModel } from './caching-supply-catalog.read-model';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

describe('CachingSupplyCatalogReadModel', () => {
  const record: PublicSupplyRecord = {
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
        findActiveById: () => Promise.resolve(null),
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

  it('findActiveById se sirve de la misma caché', async () => {
    const clock = 1000;
    const inner = fakeInner();
    const cache = new CachingSupplyCatalogReadModel(
      inner.readModel,
      60_000,
      () => clock,
    );

    const found = await cache.findActiveById(record.id);
    const missing = await cache.findActiveById(
      '22222222-2222-4222-8222-222222222222',
    );

    expect(found?.id).toBe(record.id);
    expect(missing).toBeNull();
    expect(inner.calls()).toBe(1);
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
