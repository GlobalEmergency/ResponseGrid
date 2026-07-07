import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  Bin,
  BinId,
  BinKind,
  BinStatus,
  WarehouseId,
  ZoneId,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { DrizzleBinRepository } from './drizzle-bin.repository.js';
import { newPool, resetSchema, truncateAll, makeDb } from './test-support.js';

describe('DrizzleBinRepository (integración)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleBinRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleBinRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  function newBin(opts: {
    scopeId: ScopeId;
    warehouseId: WarehouseId;
    zoneId?: ZoneId | null;
    code?: string;
    kind?: BinKind;
  }): Bin {
    return Bin.create({
      id: BinId.create(),
      scopeId: opts.scopeId,
      warehouseId: opts.warehouseId,
      zoneId: opts.zoneId ?? null,
      code: opts.code ?? 'A-01',
      kind: opts.kind ?? BinKind.Shelf,
    });
  }

  it('save + findById reconstruye el bin', async () => {
    const scopeId = ScopeId.create();
    const warehouseId = WarehouseId.create();
    const zoneId = ZoneId.create();
    const bin = newBin({ scopeId, warehouseId, zoneId });
    await repo.save(bin);

    const loaded = await repo.findById(bin.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.toSnapshot(), bin.toSnapshot());
  });

  it('save hace upsert: persiste cambios de zona y estado', async () => {
    const scopeId = ScopeId.create();
    const warehouseId = WarehouseId.create();
    const bin = newBin({ scopeId, warehouseId });
    await repo.save(bin);

    const newZone = ZoneId.create();
    bin.assignZone(newZone);
    bin.block();
    await repo.save(bin);

    const loaded = await repo.findById(bin.id);
    assert.ok(loaded);
    assert.equal(loaded.zoneId?.value, newZone.value);
    assert.equal(loaded.status, BinStatus.Blocked);
  });

  it('findByCode resuelve por almacén + código', async () => {
    const scopeId = ScopeId.create();
    const warehouseId = WarehouseId.create();
    const bin = newBin({ scopeId, warehouseId, code: 'DOCK-3' });
    await repo.save(bin);

    const found = await repo.findByCode(warehouseId, 'DOCK-3');
    assert.ok(found);
    assert.equal(found.id.value, bin.id.value);
    assert.equal(await repo.findByCode(WarehouseId.create(), 'DOCK-3'), null);
  });

  it('findByWarehouse filtra por estado, tipo y zona', async () => {
    const scopeId = ScopeId.create();
    const warehouseId = WarehouseId.create();
    const zoneA = ZoneId.create();
    const shelf = newBin({
      scopeId,
      warehouseId,
      zoneId: zoneA,
      code: 'S1',
      kind: BinKind.Shelf,
    });
    const dock = newBin({
      scopeId,
      warehouseId,
      code: 'D1',
      kind: BinKind.Dock,
    });
    dock.block();
    await repo.save(shelf);
    await repo.save(dock);

    assert.equal((await repo.findByWarehouse(warehouseId, {})).length, 2);
    assert.equal(
      (await repo.findByWarehouse(warehouseId, { kind: BinKind.Dock })).length,
      1,
    );
    assert.equal(
      (await repo.findByWarehouse(warehouseId, { status: BinStatus.Active }))
        .length,
      1,
    );
    const inZoneA = await repo.findByWarehouse(warehouseId, {
      zoneId: zoneA.value,
    });
    assert.equal(inZoneA.length, 1);
    assert.equal(inZoneA[0]?.code, 'S1');
  });

  it('findByScope lista los bins de una tenencia', async () => {
    const scopeId = ScopeId.create();
    const otherScope = ScopeId.create();
    await repo.save(
      newBin({ scopeId, warehouseId: WarehouseId.create(), code: 'X1' }),
    );
    await repo.save(
      newBin({ scopeId, warehouseId: WarehouseId.create(), code: 'X2' }),
    );
    await repo.save(
      newBin({
        scopeId: otherScope,
        warehouseId: WarehouseId.create(),
        code: 'Y1',
      }),
    );

    assert.equal((await repo.findByScope(scopeId, {})).length, 2);
    assert.equal((await repo.findByScope(otherScope, {})).length, 1);
  });
});
