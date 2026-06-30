import { createDb, Db } from '../../../../shared/db';
import { suppliesTable, supplyAliasesTable } from './schema';
import { DrizzleSupplyRepository } from './drizzle-supply.repository';
import { Supply } from '../../domain/supply';
import { SupplyAlias } from '../../domain/supply-alias';
import { AliasConflictError } from '../../domain/supply-errors';
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
});
