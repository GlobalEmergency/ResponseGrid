import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  LoadTemplate,
  LoadTemplateId,
  LoadTemplateStatus,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { DrizzleLoadTemplateRepository } from './drizzle-load-template.repository.js';
import {
  newPool,
  resetSchema,
  truncateAll,
  makeDb,
  uuid,
} from './test-support.js';

describe('DrizzleLoadTemplateRepository (integración)', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  let repo: DrizzleLoadTemplateRepository;

  before(async () => {
    pool = newPool();
    await resetSchema(pool);
    db = makeDb(pool);
    repo = new DrizzleLoadTemplateRepository(db);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  function newTemplate(scopeId: ScopeId, code = 'PSA'): LoadTemplate {
    return LoadTemplate.create({
      id: LoadTemplateId.create(),
      scopeId,
      code,
      name: 'Kit PSA',
      lines: [
        {
          supplyId: uuid(),
          quantity: 10,
          unit: 'und',
          permanent: true,
          notes: 'Dotación fija',
        },
        {
          supplyId: uuid(),
          quantity: 5,
          unit: 'und',
        },
      ],
    });
  }

  it('save + findById reconstruye el agregado con sus líneas', async () => {
    const scopeId = ScopeId.create();
    const template = newTemplate(scopeId);
    await repo.save(template);

    const loaded = await repo.findById(template.id);
    assert.ok(loaded);
    assert.deepEqual(loaded.toSnapshot(), template.toSnapshot());
    assert.equal(loaded.lines.length, 2);
  });

  it('findByCode resuelve por scope + código', async () => {
    const scopeId = ScopeId.create();
    const template = newTemplate(scopeId, 'INCENDIO');
    await repo.save(template);

    const found = await repo.findByCode(scopeId, 'INCENDIO');
    assert.ok(found);
    assert.equal(found.id.value, template.id.value);

    const other = await repo.findByCode(ScopeId.create(), 'INCENDIO');
    assert.equal(other, null);
  });

  it('findByScope filtra por estado', async () => {
    const scopeId = ScopeId.create();
    const active = newTemplate(scopeId, 'A');
    const archived = newTemplate(scopeId, 'B').archive();
    await repo.save(active);
    await repo.save(archived);

    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 2);

    const onlyActive = await repo.findByScope(scopeId, {
      status: LoadTemplateStatus.Active,
    });
    assert.equal(onlyActive.length, 1);
    assert.equal(onlyActive[0]?.code, 'A');
  });

  it('findById devuelve null cuando no existe', async () => {
    const missing = await repo.findById(LoadTemplateId.create());
    assert.equal(missing, null);
  });

  it('save reemplaza las líneas (upsert del agregado completo), sin duplicar', async () => {
    const scopeId = ScopeId.create();
    const template = newTemplate(scopeId, 'REEMPLAZO');
    await repo.save(template);

    const newSupplyId = uuid();
    const replaced = LoadTemplate.fromSnapshot({
      ...template.toSnapshot(),
      lines: [
        {
          supplyId: newSupplyId,
          quantity: 3,
          unit: 'l',
          permanent: false,
          notes: null,
        },
      ],
    });
    await repo.save(replaced);

    const loaded = await repo.findById(template.id);
    assert.ok(loaded);
    assert.equal(loaded.lines.length, 1);
    assert.equal(loaded.lines[0]?.supplyId, newSupplyId);
  });

  it('re-save del mismo id actualiza la raíz (status), no inserta otra fila', async () => {
    const scopeId = ScopeId.create();
    const template = newTemplate(scopeId, 'ARCHIVO');
    await repo.save(template);
    // Re-guarda el MISMO kit archivado: ejercita el `set` del upsert de la raíz.
    await repo.save(template.archive());

    const loaded = await repo.findById(template.id);
    assert.ok(loaded);
    assert.equal(loaded.status, LoadTemplateStatus.Archived);
    // Sigue siendo una sola fila (upsert, no insert): el scope ve un único kit.
    const all = await repo.findByScope(scopeId, {});
    assert.equal(all.length, 1);
  });
});
