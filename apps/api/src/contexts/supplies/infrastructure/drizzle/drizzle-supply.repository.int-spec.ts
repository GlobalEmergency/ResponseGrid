import { sql } from 'drizzle-orm';
import { createDb, Db } from '../../../../shared/db';
import { suppliesTable, supplyAliasesTable } from './schema';
import { DrizzleSupplyRepository } from './drizzle-supply.repository';
import {
  Supply,
  SupplyAlias,
  AliasConflictError,
} from '@globalemergency/warehouse-core/catalog';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CHILD = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function makeSupply(opts: {
  id: string;
  code: string;
  name?: string;
  categorySlug?: string;
  variantOfId?: string | null;
}): Supply {
  return Supply.create({
    id: opts.id,
    code: opts.code,
    name: opts.name ?? 'Insumo de prueba',
    categorySlug: opts.categorySlug ?? 'other',
    defaultUnit: 'und',
    variantOfId: opts.variantOfId ?? null,
  });
}

describe('DrizzleSupplyRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleSupplyRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleSupplyRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Slate limpio: borra alias antes que supplies (FK), incluida la semilla.
    await db.delete(supplyAliasesTable);
    await db.delete(suppliesTable);
  });

  it('save inserta y actualiza (upsert) con tipos reales', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001', name: 'Agua' }));
    let found = await repo.findById(A);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Agua');

    await repo.save(found!.rename('Agua mineral').recategorize('food'));
    found = await repo.findById(A);
    expect(found!.name).toBe('Agua mineral');
    expect(found!.categorySlug).toBe('food');
  });

  it('persiste y actualiza la naturaleza logística (#269), por defecto null', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001', name: 'Agua' }));
    expect((await repo.findById(A))!.nature).toBeNull();

    // Clasifica y relee.
    await repo.save((await repo.findById(A))!.reclassify('fungible'));
    expect((await repo.findById(A))!.nature).toBe('fungible');

    // Reclasifica a otra naturaleza (upsert set).
    await repo.save((await repo.findById(A))!.reclassify('reusable'));
    expect((await repo.findById(A))!.nature).toBe('reusable');

    // Limpia (vuelve a sin clasificar).
    await repo.save((await repo.findById(A))!.reclassify(null));
    expect((await repo.findById(A))!.nature).toBeNull();
  });

  it('persiste, actualiza y limpia los códigos externos de interop (#398), por defecto {}', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001', name: 'Agua' }));
    expect((await repo.findById(A))!.externalCodes).toEqual({});

    // Asigna códigos y relee (jsonb round-trip).
    await repo.save(
      (await repo.findById(A))!.setExternalCodes({
        unspsc: '51101500',
        hxl: '#item+code',
      }),
    );
    expect((await repo.findById(A))!.externalCodes).toEqual({
      unspsc: '51101500',
      hxl: '#item+code',
    });

    // Reemplaza el mapa (upsert set).
    await repo.save(
      (await repo.findById(A))!.setExternalCodes({ who_eml: 'core-121' }),
    );
    expect((await repo.findById(A))!.externalCodes).toEqual({
      who_eml: 'core-121',
    });

    // Búsqueda inversa por código externo (usa el índice GIN, operador @>).
    const [hit] = await db
      .select()
      .from(suppliesTable)
      .where(
        sql`${suppliesTable.externalCodes} @> ${'{"who_eml":"core-121"}'}`,
      );
    expect(hit?.id).toBe(A);

    // Limpia (vuelve al mapa vacío).
    await repo.save((await repo.findById(A))!.setExternalCodes({}));
    expect((await repo.findById(A))!.externalCodes).toEqual({});
  });

  it('save persiste y reemplaza las traducciones, normalizando locale/nombre (#320)', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001', name: 'Agua' }), [
      { locale: 'en', name: 'Water' },
      { locale: 'FR ', name: '  Eau  ' },
      { locale: 'de', name: '   ' }, // nombre vacío -> se descarta
    ]);
    expect(await repo.listTranslations(A)).toEqual([
      { locale: 'en', name: 'Water' },
      { locale: 'fr', name: 'Eau' },
    ]);

    // Reemplazo del set: 'fr' desaparece, 'en' se actualiza.
    await repo.save((await repo.findById(A))!, [
      { locale: 'en', name: 'Drinking water' },
    ]);
    expect(await repo.listTranslations(A)).toEqual([
      { locale: 'en', name: 'Drinking water' },
    ]);

    // Guardar SIN traducciones (undefined) no toca las existentes.
    await repo.save((await repo.findById(A))!.rename('Agua potable'));
    expect(await repo.listTranslations(A)).toEqual([
      { locale: 'en', name: 'Drinking water' },
    ]);
  });

  it('nextSequenceValue devuelve números de secuencia monótonos', async () => {
    const first = await repo.nextSequenceValue();
    const second = await repo.nextSequenceValue();
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first + 1);
  });

  it('list filtra por estado, categoría y búsqueda libre', async () => {
    await repo.save(
      makeSupply({
        id: A,
        code: 'INS-9001',
        name: 'Agua',
        categorySlug: 'water',
      }),
    );
    await repo.save(
      makeSupply({
        id: B,
        code: 'INS-9002',
        name: 'Arroz',
        categorySlug: 'food',
      }),
    );
    await repo.save((await repo.findById(B))!.archive());

    expect(await repo.list({})).toHaveLength(2);
    expect(await repo.list({ status: 'active' })).toHaveLength(1);
    expect(await repo.list({ status: 'archived' })).toHaveLength(1);
    expect(await repo.list({ categorySlug: 'water' })).toHaveLength(1);
    expect((await repo.list({ q: 'arr' }))[0].id).toBe(B);
    expect((await repo.list({ q: 'INS-9001' }))[0].id).toBe(A);
  });

  it('addAlias es idempotente para el mismo insumo y conflictúa con otro', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001' }));
    await repo.save(makeSupply({ id: B, code: 'INS-9002' }));

    await repo.addAlias(
      SupplyAlias.create({ alias: '  Aguíta  ', supplyId: A }),
    );
    await repo.addAlias(SupplyAlias.create({ alias: 'aguita', supplyId: A })); // idempotente
    expect(await repo.listAliases(A)).toHaveLength(1);

    await expect(
      repo.addAlias(SupplyAlias.create({ alias: 'aguita', supplyId: B })),
    ).rejects.toBeInstanceOf(AliasConflictError);

    await repo.removeAlias('AGUITA');
    expect(await repo.listAliases(A)).toHaveLength(0);
  });

  it('merge mueve alias, repunta variantes hijas y archiva el origen', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001' }));
    await repo.save(makeSupply({ id: B, code: 'INS-9002' }));
    await repo.save(
      makeSupply({ id: CHILD, code: 'INS-9003', variantOfId: A }),
    );
    await repo.addAlias(
      SupplyAlias.create({ alias: 'solo-en-a', supplyId: A }),
    );
    await repo.addAlias(
      SupplyAlias.create({ alias: 'otro-en-a', supplyId: A }),
    );
    await repo.addAlias(
      SupplyAlias.create({ alias: 'solo-en-b', supplyId: B }),
    );

    await repo.merge(A, B);

    const aliasesB = (await repo.listAliases(B)).map((a) => a.alias);
    expect(aliasesB).toEqual(
      expect.arrayContaining(['solo-en-a', 'otro-en-a', 'solo-en-b']),
    );
    expect(await repo.listAliases(A)).toHaveLength(0);
    const child = await repo.findById(CHILD);
    expect(child!.variantOfId).toBe(B);
    const source = await repo.findById(A);
    expect(source!.status).toBe('archived');
  });

  it('merge mueve las traducciones al canónico (target gana el conflicto de locale)', async () => {
    await repo.save(makeSupply({ id: A, code: 'INS-9001' }), [
      { locale: 'en', name: 'From A' },
      { locale: 'fr', name: 'Depuis A' },
    ]);
    await repo.save(makeSupply({ id: B, code: 'INS-9002' }), [
      { locale: 'en', name: 'From B' },
    ]);

    await repo.merge(A, B);

    // B conserva su 'en' (gana el canónico) y hereda 'fr' de A.
    expect(await repo.listTranslations(B)).toEqual([
      { locale: 'en', name: 'From B' },
      { locale: 'fr', name: 'Depuis A' },
    ]);
    // A queda sin traducciones huérfanas.
    expect(await repo.listTranslations(A)).toEqual([]);
  });
});
