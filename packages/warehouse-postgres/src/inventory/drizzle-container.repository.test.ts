import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

// Sólo warehouse-core (dominio) + warehouse-postgres (persistencia). Nunca
// `apps/*`: es la prueba de que el adaptador de containers es reutilizable sin
// ResponseGrid (un WMS standalone lo consumiría exactamente así).
import {
  Container,
  ContainerId,
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '@globalemergency/warehouse-core/containers';
import { ScopeId, SupplyLine } from '@globalemergency/warehouse-core/kernel';
import { DrizzleContainerRepository } from './index.js';
import { newPool, resetSchema, makeDb } from './test-support.js';

describe('DrizzleContainerRepository (persistencia del agregado Container)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleContainerRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleContainerRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE wms.containers, wms.container_code_sequences RESTART IDENTITY CASCADE`,
    );
  });

  it('round-trip: save → findById reconstruye el snapshot completo', async () => {
    const scopeId = ScopeId.create();
    const container = Container.create({
      id: ContainerId.create(),
      code: 'PAL-0001',
      type: ContainerType.Pallet,
      scopeId,
      lines: [
        SupplyLine.create({
          name: 'Agua 1.5L',
          quantity: 24,
          unit: 'botella',
          category: 'water',
        }),
        SupplyLine.create({
          name: 'Manta térmica',
          quantity: 10,
          unit: 'unidad',
          category: 'shelter',
        }),
      ],
      grossWeightKg: 42.5,
      grossVolumeM3: 1.2,
      holder: { type: ContainerHolderType.Resource, id: ScopeId.create().value },
    });
    await repo.save(container);

    const loaded = await repo.findById(container.id);
    assert.ok(loaded);
    const s = loaded.toSnapshot();
    assert.equal(s.id, container.id.value);
    assert.equal(s.code, 'PAL-0001');
    assert.equal(s.type, ContainerType.Pallet);
    assert.equal(s.scopeId, scopeId.value);
    assert.equal(s.parentContainerId, null);
    assert.equal(s.lines.length, 2);
    assert.equal(s.lines[0]?.name, 'Agua 1.5L');
    assert.equal(s.lines[0]?.category, 'water');
    assert.equal(s.grossWeightKg, 42.5);
    assert.equal(s.grossVolumeM3, 1.2);
    assert.equal(s.holderType, ContainerHolderType.Resource);
    assert.equal(s.status, ContainerStatus.Open);
  });

  it('save es un upsert: re-guardar refresca contenido, holder y estado', async () => {
    const scopeId = ScopeId.create();
    const container = Container.create({
      id: ContainerId.create(),
      code: 'CAJ-0001',
      type: ContainerType.Box,
      scopeId,
    });
    await repo.save(container);

    container.addLine(
      SupplyLine.create({
        name: 'Arroz 1kg',
        quantity: 20,
        unit: 'paquete',
        category: 'food',
      }),
    );
    container.moveToHolder({
      type: ContainerHolderType.Shipment,
      id: ScopeId.create().value,
    });
    container.seal();
    await repo.save(container);

    const loaded = await repo.findById(container.id);
    assert.ok(loaded);
    assert.equal(loaded.lines.length, 1);
    assert.equal(loaded.status, ContainerStatus.Sealed);
    assert.equal(loaded.holder?.type, ContainerHolderType.Shipment);
    // Sigue habiendo una sola fila (upsert por id, no un segundo insert).
    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 1);
  });

  it('findChildren: el árbol se compone por referencia (parentContainerId)', async () => {
    const scopeId = ScopeId.create();
    const pallet = Container.create({
      id: ContainerId.create(),
      code: 'PAL-0002',
      type: ContainerType.Pallet,
      scopeId,
    });
    await repo.save(pallet);

    const boxA = Container.create({
      id: ContainerId.create(),
      code: 'CAJ-0002',
      type: ContainerType.Box,
      scopeId,
    });
    const boxB = Container.create({
      id: ContainerId.create(),
      code: 'CAJ-0003',
      type: ContainerType.Box,
      scopeId,
    });
    boxA.setParent(pallet.id);
    boxB.setParent(pallet.id);
    await repo.save(boxA);
    await repo.save(boxB);

    const children = await repo.findChildren(pallet.id);
    assert.equal(children.length, 2);
    const codes = children.map((c) => c.code).sort();
    assert.deepEqual(codes, ['CAJ-0002', 'CAJ-0003']);
    for (const child of children) {
      assert.equal(child.parentContainerId?.value, pallet.id.value);
    }

    // topLevelOnly deja fuera a las cajas anidadas: sólo el palet raíz.
    const roots = await repo.findByScope(scopeId, { topLevelOnly: true });
    assert.equal(roots.length, 1);
    assert.equal(roots[0]?.id.value, pallet.id.value);
  });

  it('findByScope filtra por type, status y holder', async () => {
    const scopeId = ScopeId.create();
    const holderId = ScopeId.create().value;

    const sealedPallet = Container.create({
      id: ContainerId.create(),
      code: 'PAL-0003',
      type: ContainerType.Pallet,
      scopeId,
      holder: { type: ContainerHolderType.Shipment, id: holderId },
    });
    sealedPallet.seal();
    await repo.save(sealedPallet);

    const openBox = Container.create({
      id: ContainerId.create(),
      code: 'CAJ-0004',
      type: ContainerType.Box,
      scopeId,
    });
    await repo.save(openBox);

    assert.equal(
      (await repo.findByScope(scopeId, { type: ContainerType.Pallet })).length,
      1,
    );
    assert.equal(
      (await repo.findByScope(scopeId, { status: ContainerStatus.Sealed }))
        .length,
      1,
    );
    assert.equal(
      (
        await repo.findByScope(scopeId, {
          holderType: ContainerHolderType.Shipment,
          holderId,
        })
      ).length,
      1,
    );
    assert.equal((await repo.findByScope(scopeId, {})).length, 2);
  });

  it('nextSequence es monotónico y aislado por (scope, type)', async () => {
    const scopeA = ScopeId.create();
    const scopeB = ScopeId.create();

    assert.equal(await repo.nextSequence(scopeA, ContainerType.Pallet), 1);
    assert.equal(await repo.nextSequence(scopeA, ContainerType.Pallet), 2);
    assert.equal(await repo.nextSequence(scopeA, ContainerType.Pallet), 3);

    // Otro type del mismo scope arranca en 1 (secuencia independiente).
    assert.equal(await repo.nextSequence(scopeA, ContainerType.Box), 1);
    // Otro scope arranca en 1 (aislamiento por tenencia).
    assert.equal(await repo.nextSequence(scopeB, ContainerType.Pallet), 1);
    // La secuencia de scopeA/Pallet sigue avanzando, no se ve afectada.
    assert.equal(await repo.nextSequence(scopeA, ContainerType.Pallet), 4);
  });
});
