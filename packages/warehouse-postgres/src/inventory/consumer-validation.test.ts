import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// SOLO se importa warehouse-core (dominio) y warehouse-postgres (persistencia).
// NUNCA `apps/*`: este test es la prueba de que el paquete es reutilizable sin
// ResponseGrid — un WMS standalone lo consumiría exactamente así.
import {
  Warehouse,
  WarehouseId,
  ZoneId,
  ZoneKind,
  Bin,
  BinId,
  BinKind,
  StockItem,
  StockItemId,
  StockMovement,
  StockMovementId,
  applyStockMovement,
  allocateFefo,
  Quantity,
  StockStatus,
  MovementKind,
} from '@globalemergency/warehouse-core/inventory';
import {
  Container,
  ContainerId,
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '@globalemergency/warehouse-core/containers';
import { ScopeId, SupplyLine } from '@globalemergency/warehouse-core/kernel';
import {
  DrizzleWarehouseRepository,
  DrizzleBinRepository,
  DrizzleStockItemRepository,
  DrizzleStockMovementRepository,
  DrizzleContainerRepository,
  StaleStockItemError,
  runInWmsTransaction,
} from './index.js';
import {
  newPool,
  resetSchema,
  truncateAll,
  makeDb,
  uuid,
} from './test-support.js';

/**
 * Consumidor de validación standalone: ejercita un flujo dominio + persistencia
 * de punta a punta (alta de almacén/zona/bin → entrada → traslado bin→bin →
 * salida FEFO), y comprueba que la concurrencia optimista y la idempotencia se
 * sostienen sobre la BBDD real. Es la prueba de reutilización del paquete.
 */
describe('Consumidor standalone: flujo WMS end-to-end (dominio + persistencia)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let warehouses: DrizzleWarehouseRepository;
  let bins: DrizzleBinRepository;
  let items: DrizzleStockItemRepository;
  let movements: DrizzleStockMovementRepository;
  let containers: DrizzleContainerRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    warehouses = new DrizzleWarehouseRepository(db);
    bins = new DrizzleBinRepository(db);
    items = new DrizzleStockItemRepository(db);
    movements = new DrizzleStockMovementRepository(db);
    containers = new DrizzleContainerRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  it('alta de layout → entrada idempotente → traslado → salida FEFO', async () => {
    const scopeId = ScopeId.create();
    const supplyId = uuid();
    const unit = 'unit';

    // --- 1. Layout: almacén con una zona de almacenaje y dos bins. ----------
    const storageZoneId = ZoneId.create();
    const warehouse = Warehouse.create({
      id: WarehouseId.create(),
      scopeId,
      code: 'ALM-CENTRAL',
      name: 'Almacén Central',
      zones: [
        {
          id: storageZoneId,
          code: 'ALM',
          name: 'Almacenaje',
          kind: ZoneKind.Storage,
        },
      ],
    });
    await warehouses.save(warehouse);

    const binA = Bin.create({
      id: BinId.create(),
      scopeId,
      warehouseId: warehouse.id,
      zoneId: storageZoneId,
      code: 'A-01',
      kind: BinKind.Shelf,
    });
    const binB = Bin.create({
      id: BinId.create(),
      scopeId,
      warehouseId: warehouse.id,
      zoneId: storageZoneId,
      code: 'B-01',
      kind: BinKind.Shelf,
    });
    await bins.save(binA);
    await bins.save(binB);

    // --- 2. Entrada (receipt): item nuevo en binA, lote que caduca pronto. ---
    const receiptKey = 'albaran-0001';
    // El grano no existía: se da de alta el item vacío (v1, path INSERT) y luego
    // se aplica la entrada (v2, path UPDATE con guarda de versión). Así el flujo
    // ejercita ambos caminos del repositorio.
    const itemA = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId: warehouse.id,
      binId: binA.id,
      supplyId,
      lot: { code: 'L-EARLY', expiresAt: new Date('2026-09-01T00:00:00.000Z') },
      quantity: Quantity.of(0, unit),
      status: StockStatus.Available,
    });
    await items.save(itemA); // alta (v1)

    const receipt = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Receipt,
      quantity: Quantity.of(100, unit),
      toItemId: itemA.id,
      idempotencyKey: receiptKey,
    });
    // Patrón del host: resolver por clave antes de aplicar (guardia anti-doble).
    const already = await movements.findByIdempotencyKey(scopeId, receiptKey);
    assert.equal(already, null);
    applyStockMovement(receipt, { to: itemA });
    await items.save(itemA); // entrada aplicada (v2)
    await movements.append(receipt);

    // Reintento del mismo albarán: la idempotencia deja un solo asiento.
    await movements.append(
      StockMovement.record({
        id: StockMovementId.create(),
        scopeId,
        kind: MovementKind.Receipt,
        quantity: Quantity.of(100, unit),
        toItemId: itemA.id,
        idempotencyKey: receiptKey,
      }),
    );
    assert.equal((await movements.findByScope(scopeId, {})).length, 1);

    const persistedA = await items.findById(itemA.id);
    assert.equal(persistedA?.quantity.amount, 100);

    // --- 3. Traslado binA → binB de 30 unidades (mismo lote, item nuevo). ----
    const itemB = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId: warehouse.id,
      binId: binB.id,
      supplyId,
      lot: { code: 'L-EARLY', expiresAt: new Date('2026-09-01T00:00:00.000Z') },
      quantity: Quantity.of(0, unit),
      status: StockStatus.Available,
    });
    await items.save(itemB); // alta del grano destino (v1)

    const transfer = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Transfer,
      quantity: Quantity.of(30, unit),
      fromItemId: itemA.id,
      toItemId: itemB.id,
    });
    const fromItem = await items.findById(itemA.id);
    assert.ok(fromItem);
    applyStockMovement(transfer, { from: fromItem, to: itemB });
    // Persistencia ATÓMICA del traslado: ambas patas + el asiento en una sola
    // transacción (Unit of Work), como exige el dominio de StockMovement.
    await runInWmsTransaction(db, async (uow) => {
      await uow.items.save(fromItem); // A: 100 → 70 (v2 → v3)
      await uow.items.save(itemB); // B: 0 → 30 (v1 → v2)
      await uow.movements.append(transfer);
    });

    assert.equal((await items.findById(itemA.id))?.quantity.amount, 70);
    assert.equal((await items.findById(itemB.id))?.quantity.amount, 30);

    // --- 4. Un segundo lote en binB que caduca MÁS TARDE (para FEFO). --------
    const itemBLate = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId: warehouse.id,
      binId: binB.id,
      supplyId,
      lot: { code: 'L-LATE', expiresAt: new Date('2027-06-01T00:00:00.000Z') },
      quantity: Quantity.of(50, unit),
      status: StockStatus.Available,
    });
    await items.save(itemBLate);

    // --- 5. Salida FEFO de 90 unidades sobre el stock persistido. -----------
    // Candidatos = stock disponible del producto en el scope (leído de la BBDD).
    const candidates = await items.findByScope(scopeId, {
      status: StockStatus.Available,
      supplyId,
    });
    // Stock disponible: A(70, cad 2026-09) + B-early(30, cad 2026-09) + B-late(50, cad 2027-06) = 150.
    const plan = allocateFefo(
      { scopeId, supplyId, quantity: Quantity.of(90, unit) },
      candidates,
    );
    assert.equal(plan.fullyAllocated, true);
    assert.equal(plan.allocated.amount, 90);

    // FEFO: primero los lotes que caducan antes (L-EARLY: A=70 y B-early=30 =
    // 100 disponibles) y sólo entonces L-LATE. 90 se cubre con los tempranos.
    for (const line of plan.lines) {
      assert.equal(line.item.lot?.code, 'L-EARLY');
    }
    assert.equal(
      plan.lines.reduce((sum, l) => sum + l.quantity.amount, 0),
      90,
    );

    // Aplicar la salida: emitir un issue por línea y decrementar el item.
    for (const line of plan.lines) {
      const issue = StockMovement.record({
        id: StockMovementId.create(),
        scopeId,
        kind: MovementKind.Issue,
        quantity: line.quantity,
        fromItemId: line.item.id,
      });
      const fresh = await items.findById(line.item.id);
      assert.ok(fresh);
      applyStockMovement(issue, { from: fresh });
      await items.save(fresh);
      await movements.append(issue);
    }

    // El lote tardío queda intacto; el temprano queda a 10 en total.
    const late = await items.findById(itemBLate.id);
    assert.equal(late?.quantity.amount, 50);
    const remainingEarly = (await items.findByScope(scopeId, { supplyId }))
      .filter((i) => i.lot?.code === 'L-EARLY')
      .reduce((sum, i) => sum + i.quantity.amount, 0);
    assert.equal(remainingEarly, 10);

    // --- 6. La concurrencia optimista se sostiene end-to-end. ---------------
    const stale = await items.findById(itemBLate.id); // v1
    const winner = await items.findById(itemBLate.id); // v1
    assert.ok(stale && winner);
    winner.decrease(Quantity.of(5, unit));
    await items.save(winner); // v1 → v2
    stale.decrease(Quantity.of(1, unit)); // sigue en v1
    await assert.rejects(() => items.save(stale), StaleStockItemError);
    assert.equal((await items.findById(itemBLate.id))?.quantity.amount, 45);
  });

  it('un fallo a mitad de runInWmsTransaction revierte todo (sin mutación parcial)', async () => {
    const scopeId = ScopeId.create();
    const supplyId = uuid();
    const unit = 'unit';
    const warehouseId = WarehouseId.create();

    // Dos items del mismo producto en bins distintos: origen con stock, destino
    // vacío. Se persisten fuera de la transacción (estado inicial conocido).
    const from = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId,
      binId: BinId.create(),
      supplyId,
      lot: null,
      quantity: Quantity.of(100, unit),
      status: StockStatus.Available,
    });
    const to = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId,
      binId: BinId.create(),
      supplyId,
      lot: null,
      quantity: Quantity.of(0, unit),
      status: StockStatus.Available,
    });
    await items.save(from);
    await items.save(to);

    // Traslado en memoria: from 100 → 70, to 0 → 30.
    const transfer = StockMovement.record({
      id: StockMovementId.create(),
      scopeId,
      kind: MovementKind.Transfer,
      quantity: Quantity.of(30, unit),
      fromItemId: from.id,
      toItemId: to.id,
    });
    applyStockMovement(transfer, { from, to });

    const boom = new Error('fallo deliberado a mitad de la transacción');
    await assert.rejects(
      () =>
        runInWmsTransaction(db, async (uow) => {
          await uow.items.save(from); // se escribe la primera pata…
          await uow.items.save(to); // …y la segunda…
          throw boom; // …pero algo falla antes del COMMIT.
        }),
      (err) => err === boom,
    );

    // ROLLBACK: NINGUNA mutación quedó persistida — ambos items siguen en su
    // estado inicial (v1, 100 y 0), y el asiento nunca se registró.
    const reloadedFrom = await items.findById(from.id);
    const reloadedTo = await items.findById(to.id);
    assert.equal(reloadedFrom?.quantity.amount, 100);
    assert.equal(reloadedFrom?.version, 1);
    assert.equal(reloadedTo?.quantity.amount, 0);
    assert.equal(reloadedTo?.version, 1);
    assert.equal((await movements.findByScope(scopeId, {})).length, 0);
  });

  it('empaqueta un palet y su stock en la MISMA transacción (atomicidad palet+stock)', async () => {
    const scopeId = ScopeId.create();
    const supplyId = uuid();
    const unit = 'unit';
    const warehouseId = WarehouseId.create();
    const binId = BinId.create();

    // El código del palet lo asigna el allocator atómico del propio repo.
    const seq = await containers.nextSequence(scopeId, ContainerType.Pallet);
    assert.equal(seq, 1);
    const pallet = Container.create({
      id: ContainerId.create(),
      code: `PAL-${String(seq).padStart(4, '0')}`,
      type: ContainerType.Pallet,
      scopeId,
      lines: [
        SupplyLine.create({
          name: 'Agua 1.5L',
          quantity: 24,
          unit: 'botella',
          category: 'water',
        }),
      ],
      grossWeightKg: 36,
    });

    const stock = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId,
      binId,
      supplyId,
      lot: null,
      quantity: Quantity.of(24, unit),
      status: StockStatus.Available,
    });

    // Palet + stock que lo constituye se confirman juntos: un fallo revertiría
    // ambos (misma transacción de la Unit of Work).
    await runInWmsTransaction(db, async (uow) => {
      await uow.containers.save(pallet);
      await uow.items.save(stock);
    });

    const loadedPallet = await containers.findById(pallet.id);
    assert.ok(loadedPallet);
    assert.equal(loadedPallet.code, 'PAL-0001');
    assert.equal(loadedPallet.status, ContainerStatus.Open);
    assert.equal(loadedPallet.lines.length, 1);
    assert.equal((await items.findById(stock.id))?.quantity.amount, 24);

    // Un fallo a mitad revierte el palet Y el stock (nada queda persistido).
    const boom = new Error('fallo deliberado empaquetando');
    const orphanPallet = Container.create({
      id: ContainerId.create(),
      code: 'PAL-0002',
      type: ContainerType.Pallet,
      scopeId,
      holder: { type: ContainerHolderType.Shipment, id: uuid() },
    });
    const orphanStock = StockItem.create({
      id: StockItemId.create(),
      scopeId,
      warehouseId,
      binId: BinId.create(),
      supplyId,
      lot: null,
      quantity: Quantity.of(5, unit),
      status: StockStatus.Available,
    });
    await assert.rejects(
      () =>
        runInWmsTransaction(db, async (uow) => {
          await uow.containers.save(orphanPallet);
          await uow.items.save(orphanStock);
          throw boom;
        }),
      (err) => err === boom,
    );
    assert.equal(await containers.findById(orphanPallet.id), null);
    assert.equal(await items.findById(orphanStock.id), null);
  });
});
