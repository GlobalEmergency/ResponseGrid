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
});
