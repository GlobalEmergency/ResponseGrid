import { sql } from 'drizzle-orm';
import { createDb, Db } from '../../../../shared/db';
import { DrizzleCategoryRepository } from './drizzle-category.repository';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

describe('DrizzleCategoryRepository — kind (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleCategoryRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleCategoryRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('expone kind: medical_personnel es personnel, el resto material', async () => {
    const categories = await repo.listCategories({ includeArchived: true });
    const bySlug = new Map(categories.map((c) => [c.slug, c]));

    expect(bySlug.get('medical_personnel')?.kind).toBe('personnel');
    expect(bySlug.get('food')?.kind).toBe('material');
    expect(bySlug.get('water')?.kind).toBe('material');
  });

  it('findBySlug también transporta kind', async () => {
    const personnel = await repo.findBySlug('medical_personnel', {
      includeArchived: true,
    });
    expect(personnel?.kind).toBe('personnel');
  });

  it('round-trip de externalCodes (#398): crea con códigos, edita y por defecto {}', async () => {
    const slug = 'interop_test_398';
    try {
      const created = await repo.createCategory({
        slug,
        labelEs: 'Interop',
        labelEn: 'Interop',
        parentSlug: null,
        vertical: 'general',
        sort: 999,
        externalCodes: { unspsc: '51101500' },
      });
      expect(created.externalCodes).toEqual({ unspsc: '51101500' });
      expect((await repo.findBySlug(slug))!.externalCodes).toEqual({
        unspsc: '51101500',
      });

      const updated = await repo.updateCategory(slug, {
        slug,
        labelEs: 'Interop',
        labelEn: 'Interop',
        parentSlug: null,
        vertical: 'general',
        sort: 999,
        externalCodes: { hxl: '#item+code' },
      });
      expect(updated.externalCodes).toEqual({ hxl: '#item+code' });

      // Sin externalCodes en el input → el repo cae al mapa vacío por defecto.
      const cleared = await repo.updateCategory(slug, {
        slug,
        labelEs: 'Interop',
        labelEn: 'Interop',
        parentSlug: null,
        vertical: 'general',
        sort: 999,
      });
      expect(cleared.externalCodes).toEqual({});
    } finally {
      await db.execute(sql`DELETE FROM categories WHERE slug = ${slug}`);
    }
  });
});
