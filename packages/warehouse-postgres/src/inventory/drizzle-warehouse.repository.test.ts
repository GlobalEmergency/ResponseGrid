import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  Warehouse,
  WarehouseId,
  ZoneId,
  ZoneKind,
  WarehouseStatus,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { DrizzleWarehouseRepository } from './drizzle-warehouse.repository.js';
import { newPool, resetSchema, truncateAll, makeDb } from './test-support.js';

describe('DrizzleWarehouseRepository (integración)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleWarehouseRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleWarehouseRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  function newWarehouse(scopeId: ScopeId, code = 'ALM-1'): Warehouse {
    return Warehouse.create({
      id: WarehouseId.create(),
      scopeId,
      code,
      name: 'Almacén Central',
      address: 'Calle Mayor 1',
      geo: { lat: 40.4, lng: -3.7 },
      zones: [
        {
          id: ZoneId.create(),
          code: 'REC',
          name: 'Recepción',
          kind: ZoneKind.Receiving,
        },
        {
          id: ZoneId.create(),
          code: 'ALM',
          name: 'Almacenaje',
          kind: ZoneKind.Storage,
        },
      ],
    });
  }

  it('save + findById reconstruye el agregado con sus zonas', async () => {
    const scopeId = ScopeId.create();
    const warehouse = newWarehouse(scopeId);
    await repo.save(warehouse);

    const loaded = await repo.findById(warehouse.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.toSnapshot(), warehouse.toSnapshot());
    assert.equal(loaded.zones.length, 2);
  });

  it('findByCode resuelve por scope + código', async () => {
    const scopeId = ScopeId.create();
    const warehouse = newWarehouse(scopeId, 'DEP-9');
    await repo.save(warehouse);

    const found = await repo.findByCode(scopeId, 'DEP-9');
    assert.ok(found);
    assert.equal(found.id.value, warehouse.id.value);

    const other = await repo.findByCode(ScopeId.create(), 'DEP-9');
    assert.equal(other, null);
  });

  it('findByScope filtra por estado', async () => {
    const scopeId = ScopeId.create();
    const active = newWarehouse(scopeId, 'A');
    const archived = newWarehouse(scopeId, 'B');
    archived.archive();
    await repo.save(active);
    await repo.save(archived);

    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 2);

    const onlyActive = await repo.findByScope(scopeId, {
      status: WarehouseStatus.Active,
    });
    assert.equal(onlyActive.length, 1);
    assert.equal(onlyActive[0]?.code, 'A');
  });

  it('save reemplaza las zonas (upsert del agregado completo)', async () => {
    const scopeId = ScopeId.create();
    const warehouse = newWarehouse(scopeId);
    await repo.save(warehouse);

    warehouse.addZone({
      id: ZoneId.create(),
      code: 'EXP',
      name: 'Expedición',
      kind: ZoneKind.Shipping,
    });
    warehouse.renameZone(warehouse.zones[0]!.id, 'Recepción Norte');
    await repo.save(warehouse);

    const loaded = await repo.findById(warehouse.id);
    assert.ok(loaded);
    assert.equal(loaded.zones.length, 3);
    assert.deepEqual(loaded.zones.map((z) => z.code).sort(), [
      'ALM',
      'EXP',
      'REC',
    ]);
    const rec = loaded.zones.find((z) => z.code === 'REC');
    assert.equal(rec?.name, 'Recepción Norte');
  });

  it('findById devuelve null cuando no existe', async () => {
    const missing = await repo.findById(WarehouseId.create());
    assert.equal(missing, null);
  });
});
