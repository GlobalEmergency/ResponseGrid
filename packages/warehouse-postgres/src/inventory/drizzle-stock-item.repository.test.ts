import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  StockItem,
  StockItemId,
  BinId,
  WarehouseId,
  Quantity,
  StockStatus,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { DrizzleStockItemRepository } from './drizzle-stock-item.repository.js';
import { StaleStockItemError } from './stock-persistence-errors.js';
import {
  newPool,
  resetSchema,
  truncateAll,
  makeDb,
  uuid,
} from './test-support.js';

describe('DrizzleStockItemRepository (integración)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleStockItemRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleStockItemRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  function newItem(opts: {
    scopeId: ScopeId;
    warehouseId?: WarehouseId;
    binId?: BinId;
    supplyId?: string;
    lot?: { code: string; expiresAt?: Date | null } | null;
    amount?: number;
    unit?: string;
    status?: StockStatus;
  }): StockItem {
    return StockItem.create({
      id: StockItemId.create(),
      scopeId: opts.scopeId,
      warehouseId: opts.warehouseId ?? WarehouseId.create(),
      binId: opts.binId ?? BinId.create(),
      supplyId: opts.supplyId ?? uuid(),
      lot: opts.lot ?? null,
      quantity: Quantity.of(opts.amount ?? 10, opts.unit ?? 'unit'),
      status: opts.status ?? StockStatus.Available,
    });
  }

  it('save (alta) + findById conserva el snapshot, incluida la cantidad decimal', async () => {
    const scopeId = ScopeId.create();
    const item = newItem({
      scopeId,
      lot: { code: 'L-1', expiresAt: new Date('2027-01-01T00:00:00.000Z') },
      amount: 12.345678,
      unit: 'kg',
    });
    await repo.save(item);

    const loaded = await repo.findById(item.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.toSnapshot(), item.toSnapshot());
    assert.equal(loaded.quantity.amount, 12.345678);
  });

  it('findByGrain resuelve por (bin, supply, lote, estado), con lote nulo', async () => {
    const scopeId = ScopeId.create();
    const binId = BinId.create();
    const supplyId = uuid();
    const withLot = newItem({
      scopeId,
      binId,
      supplyId,
      lot: { code: 'L-9' },
    });
    const noLot = newItem({ scopeId, binId, supplyId, lot: null });
    await repo.save(withLot);
    await repo.save(noLot);

    const foundNoLot = await repo.findByGrain({
      binId: binId.value,
      supplyId,
      lotCode: null,
      status: StockStatus.Available,
    });
    assert.ok(foundNoLot);
    assert.equal(foundNoLot.id.value, noLot.id.value);

    const foundLot = await repo.findByGrain({
      binId: binId.value,
      supplyId,
      lotCode: 'L-9',
      status: StockStatus.Available,
    });
    assert.ok(foundLot);
    assert.equal(foundLot.id.value, withLot.id.value);
  });

  it('save aplica concurrencia optimista: un update obsoleto es rechazado', async () => {
    const scopeId = ScopeId.create();
    const item = newItem({ scopeId, amount: 10, unit: 'unit' });
    await repo.save(item);

    // Dos lecturas independientes del mismo item (v1).
    const a = await repo.findById(item.id);
    const b = await repo.findById(item.id);
    assert.ok(a && b);

    // `a` incrementa y persiste → v2.
    a.increase(Quantity.of(5, 'unit'));
    await repo.save(a);

    // `b` (todavía v1) intenta persistir → StaleStockItemError.
    b.decrease(Quantity.of(2, 'unit'));
    await assert.rejects(() => repo.save(b), StaleStockItemError);

    // El estado en BBDD es el de `a` (15).
    const loaded = await repo.findById(item.id);
    assert.equal(loaded?.quantity.amount, 15);
    assert.equal(loaded?.version, 2);
  });

  it('el índice de grano rechaza un segundo item en el mismo grano (lote nulo)', async () => {
    const scopeId = ScopeId.create();
    const binId = BinId.create();
    const supplyId = uuid();
    await repo.save(newItem({ scopeId, binId, supplyId, lot: null }));

    await assert.rejects(() =>
      repo.save(newItem({ scopeId, binId, supplyId, lot: null })),
    );
  });

  it('findByBin / findByWarehouse / findByScope filtran por estado y producto', async () => {
    const scopeId = ScopeId.create();
    const warehouseId = WarehouseId.create();
    const binId = BinId.create();
    const supplyId = uuid();
    const available = newItem({
      scopeId,
      warehouseId,
      binId,
      supplyId,
      status: StockStatus.Available,
    });
    const reserved = newItem({
      scopeId,
      warehouseId,
      binId,
      supplyId,
      status: StockStatus.Reserved,
    });
    await repo.save(available);
    await repo.save(reserved);

    assert.equal((await repo.findByBin(binId, {})).length, 2);
    assert.equal(
      (await repo.findByBin(binId, { status: StockStatus.Reserved })).length,
      1,
    );
    assert.equal(
      (await repo.findByWarehouse(warehouseId, { supplyId })).length,
      2,
    );
    assert.equal((await repo.findByScope(scopeId, {})).length, 2);
  });
});
