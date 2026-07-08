import { createDb, Db } from '../../../../shared/db';
import { attributeDefinitionsTable } from './schema';
import { DrizzleAttributeDefinitionRepository } from './drizzle-attribute-definition.repository';
import { AttributeDefinition } from '@globalemergency/warehouse-core/catalog';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

describe('DrizzleAttributeDefinitionRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleAttributeDefinitionRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleAttributeDefinitionRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(attributeDefinitionsTable);
  });

  it('save inserta y luego actualiza (upsert por categoría + key + scope global)', async () => {
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'principio_activo',
        dataType: 'text',
        required: true,
        sort: 2,
      }),
    );

    let found = await repo.findOne('medical', 'principio_activo', null);
    expect(found).not.toBeNull();
    expect(found!.dataType).toBe('text');
    expect(found!.required).toBe(true);
    expect(found!.sort).toBe(2);

    // Mismo (categoría, key, scope) → actualiza en vez de duplicar.
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'principio_activo',
        dataType: 'text',
        required: false,
        sort: 5,
      }),
    );
    found = await repo.findOne('medical', 'principio_activo', null);
    expect(found!.required).toBe(false);
    expect(found!.sort).toBe(5);
    expect(await repo.findByScope(null)).toHaveLength(1);
  });

  it('persiste options (jsonb) y unit con tipos reales', async () => {
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'forma',
        dataType: 'enum',
        options: [{ value: 'tableta', label: 'Tableta' }, { value: 'jarabe' }],
      }),
    );
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'water',
        key: 'volumen',
        dataType: 'quantity',
        unit: 'l',
      }),
    );

    const forma = await repo.findOne('medical', 'forma', null);
    expect(forma!.options).toEqual([
      { value: 'tableta', label: 'Tableta' },
      { value: 'jarabe' },
    ]);
    const volumen = await repo.findOne('water', 'volumen', null);
    expect(volumen!.unit).toBe('l');
  });

  it('findByCategoryAncestry filtra por el conjunto de slugs', async () => {
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'expiry_tracked',
        dataType: 'boolean',
      }),
    );
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'water',
        key: 'potable',
        dataType: 'boolean',
      }),
    );

    const medical = await repo.findByCategoryAncestry(['medical'], null);
    expect(medical.map((d) => d.key)).toEqual(['expiry_tracked']);

    const both = await repo.findByCategoryAncestry(['medical', 'water'], null);
    expect(both).toHaveLength(2);

    expect(await repo.findByCategoryAncestry([], null)).toEqual([]);
  });

  it('archive marca archivedAt sin borrar la fila', async () => {
    await repo.save(
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'lote',
        dataType: 'text',
      }),
    );
    await repo.archive('medical', 'lote', null);

    const found = await repo.findOne('medical', 'lote', null);
    expect(found).not.toBeNull();
    expect(found!.isArchived).toBe(true);
  });
});
