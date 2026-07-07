import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  StockMovement,
  StockMovementId,
  StockItemId,
  Quantity,
  MovementKind,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { DrizzleStockMovementRepository } from './drizzle-stock-movement.repository.js';
import { newPool, resetSchema, truncateAll, makeDb } from './test-support.js';

describe('DrizzleStockMovementRepository (integración)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleStockMovementRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleStockMovementRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  function receipt(opts: {
    scopeId: ScopeId;
    toItemId: StockItemId;
    amount?: number;
    idempotencyKey?: string | null;
  }): StockMovement {
    return StockMovement.record({
      id: StockMovementId.create(),
      scopeId: opts.scopeId,
      kind: MovementKind.Receipt,
      quantity: Quantity.of(opts.amount ?? 8, 'unit'),
      toItemId: opts.toItemId,
      reason: 'Entrada de donación',
      idempotencyKey: opts.idempotencyKey ?? null,
    });
  }

  it('append + findById conserva el asiento', async () => {
    const scopeId = ScopeId.create();
    const movement = receipt({ scopeId, toItemId: StockItemId.create() });
    await repo.append(movement);

    const loaded = await repo.findById(movement.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.toSnapshot(), movement.toSnapshot());
  });

  it('idempotencia: la misma clave insertada dos veces deja una sola fila', async () => {
    const scopeId = ScopeId.create();
    const toItemId = StockItemId.create();
    const key = 'albaran-42';

    const first = receipt({ scopeId, toItemId, idempotencyKey: key });
    await repo.append(first);
    // Reintento con la misma clave (id distinto) → no-op.
    const retry = receipt({ scopeId, toItemId, idempotencyKey: key });
    await repo.append(retry);

    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 1);
    assert.equal(all[0]?.id.value, first.id.value);

    const byKey = await repo.findByIdempotencyKey(scopeId, key);
    assert.ok(byKey);
    assert.equal(byKey.id.value, first.id.value);
  });

  it('la clave de idempotencia es única por scope, no global', async () => {
    const scopeA = ScopeId.create();
    const scopeB = ScopeId.create();
    const key = 'ref-1';
    await repo.append(
      receipt({
        scopeId: scopeA,
        toItemId: StockItemId.create(),
        idempotencyKey: key,
      }),
    );
    await repo.append(
      receipt({
        scopeId: scopeB,
        toItemId: StockItemId.create(),
        idempotencyKey: key,
      }),
    );

    assert.ok(await repo.findByIdempotencyKey(scopeA, key));
    assert.ok(await repo.findByIdempotencyKey(scopeB, key));
  });

  it('findByItem devuelve movimientos donde el item es pata from o to, newest-first', async () => {
    const scopeId = ScopeId.create();
    const itemId = StockItemId.create();

    const inbound = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Receipt,
      quantity: Quantity.of(5, 'unit'),
      toItemId: itemId,
      occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const outbound = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Issue,
      quantity: Quantity.of(2, 'unit'),
      fromItemId: itemId,
      occurredAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    await repo.append(inbound);
    await repo.append(outbound);

    const ledger = await repo.findByItem(itemId, {});
    assert.equal(ledger.length, 2);
    // newest-first: el issue de febrero antes que el receipt de enero.
    assert.equal(ledger[0]?.id.value, outbound.id.value);
    assert.equal(ledger[1]?.id.value, inbound.id.value);
  });

  it('findByScope filtra por tipo y ventana temporal', async () => {
    const scopeId = ScopeId.create();
    const early = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Receipt,
      quantity: Quantity.of(1, 'unit'),
      toItemId: StockItemId.create(),
      occurredAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    const late = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Issue,
      quantity: Quantity.of(1, 'unit'),
      fromItemId: StockItemId.create(),
      occurredAt: new Date('2026-03-10T00:00:00.000Z'),
    });
    await repo.append(early);
    await repo.append(late);

    assert.equal(
      (await repo.findByScope(scopeId, { kind: MovementKind.Issue })).length,
      1,
    );
    const windowed = await repo.findByScope(scopeId, {
      occurredFrom: new Date('2026-02-01T00:00:00.000Z'),
    });
    assert.equal(windowed.length, 1);
    assert.equal(windowed[0]?.id.value, late.id.value);
  });
});
