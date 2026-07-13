import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  Warehouse,
  WarehouseId,
  WarehouseKind,
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

  it('findByScope lista varios almacenes agrupando sus zonas correctamente (sin N+1)', async () => {
    const scopeId = ScopeId.create();
    const a = newWarehouse(scopeId, 'A'); // 2 zonas: REC, ALM
    const b = newWarehouse(scopeId, 'B');
    // A B le añadimos una tercera zona para distinguir el agrupado por almacén.
    b.addZone({
      id: ZoneId.create(),
      code: 'EXP',
      name: 'Expedición',
      kind: ZoneKind.Shipping,
    });
    await repo.save(a);
    await repo.save(b);

    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 2);

    const loadedA = all.find((w) => w.code === 'A');
    const loadedB = all.find((w) => w.code === 'B');
    assert.ok(loadedA && loadedB);

    // Cada almacén recibe SÓLO sus zonas (agrupado por warehouse_id correcto).
    assert.deepEqual(loadedA.zones.map((z) => z.code).sort(), ['ALM', 'REC']);
    assert.deepEqual(loadedB.zones.map((z) => z.code).sort(), [
      'ALM',
      'EXP',
      'REC',
    ]);
    // Reconstrucción fiel del agregado.
    assert.deepEqual(loadedA.toSnapshot(), a.toSnapshot());
    assert.deepEqual(loadedB.toSnapshot(), b.toSnapshot());
  });

  it('findByScope con cero almacenes devuelve lista vacía (no consulta zonas)', async () => {
    const empty = await repo.findByScope(ScopeId.create(), {});
    assert.deepEqual(empty, []);
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

  it('un almacén fijo por defecto conserva kind=fixed y maxCapacity null', async () => {
    const scopeId = ScopeId.create();
    const warehouse = newWarehouse(scopeId, 'FIX-1');
    await repo.save(warehouse);

    const loaded = await repo.findById(warehouse.id);
    assert.ok(loaded);
    assert.equal(loaded.kind, WarehouseKind.Fixed);
    assert.equal(loaded.maxCapacity, null);
    assert.deepEqual(loaded.toSnapshot(), warehouse.toSnapshot());
  });

  it('un vehículo conserva kind=vehicle y su maxCapacity parcial (solo peso)', async () => {
    const scopeId = ScopeId.create();
    const vehicle = Warehouse.create({
      id: WarehouseId.create(),
      scopeId,
      code: 'VEH-1',
      name: 'Camión 1',
      kind: WarehouseKind.Vehicle,
      maxCapacity: { weightKg: 3500, volumeM3: null },
    });
    await repo.save(vehicle);

    const loaded = await repo.findById(vehicle.id);
    assert.ok(loaded);
    assert.equal(loaded.kind, WarehouseKind.Vehicle);
    assert.deepEqual(loaded.maxCapacity, { weightKg: 3500, volumeM3: null });
    assert.deepEqual(loaded.toSnapshot(), vehicle.toSnapshot());
  });

  it('un vehículo con capacidad completa (peso + volumen) round-trip', async () => {
    const scopeId = ScopeId.create();
    const vehicle = Warehouse.create({
      id: WarehouseId.create(),
      scopeId,
      code: 'VEH-2',
      name: 'Furgón 2',
      kind: WarehouseKind.Vehicle,
      maxCapacity: { weightKg: 1200.5, volumeM3: 8.75 },
    });
    await repo.save(vehicle);

    const loaded = await repo.findById(vehicle.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.maxCapacity, { weightKg: 1200.5, volumeM3: 8.75 });
  });

  it('actualiza la maxCapacity de un vehículo (upsert)', async () => {
    const scopeId = ScopeId.create();
    const vehicle = Warehouse.create({
      id: WarehouseId.create(),
      scopeId,
      code: 'VEH-3',
      name: 'Camión 3',
      kind: WarehouseKind.Vehicle,
      maxCapacity: null,
    });
    await repo.save(vehicle);

    vehicle.setMaxCapacity({ weightKg: 5000, volumeM3: 20 });
    await repo.save(vehicle);

    const loaded = await repo.findById(vehicle.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.maxCapacity, { weightKg: 5000, volumeM3: 20 });
  });
});
