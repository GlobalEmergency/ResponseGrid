import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { migrateWms } from './migrate.js';
import { newPool } from './test-support.js';

describe('migrateWms (integración)', () => {
  let pool: Pool;

  before(() => {
    pool = newPool();
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Esquema fresco: obliga a que la migración tenga que aplicar de cero.
    await pool.query('DROP SCHEMA IF EXISTS wms CASCADE');
  });

  it('dos migrateWms concurrentes sobre un esquema fresco resuelven sin error y no doble-aplican', async () => {
    // El advisory lock de sesión serializa ambos runners en la BBDD: uno aplica
    // y el otro, al tomar el cerrojo después, ve todo ya aplicado (no-op).
    const [a, b] = await Promise.all([migrateWms(pool), migrateWms(pool)]);

    // Exactamente uno aplicó el set completo; el otro no aplicó nada.
    const appliedCounts = [a.length, b.length].sort((x, y) => x - y);
    assert.equal(appliedCounts[0], 0);
    assert.ok(
      appliedCounts[1]! > 0,
      'uno de los runners debe haber aplicado las migraciones',
    );

    // El registro de control tiene exactamente el set aplicado una sola vez (sin
    // duplicados: `name` es PK, así que un doble-apply habría fallado antes).
    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM wms."_migrations" ORDER BY name',
    );
    const names = rows.map((r) => r.name);
    assert.deepEqual(names, [...new Set(names)]);
    assert.equal(names.length, appliedCounts[1]);
  });

  it('re-ejecutar migrateWms sobre un esquema ya migrado es no-op (idempotente)', async () => {
    const firstRun = await migrateWms(pool);
    assert.ok(firstRun.length > 0);

    const secondRun = await migrateWms(pool);
    assert.deepEqual(secondRun, []);
  });
});
