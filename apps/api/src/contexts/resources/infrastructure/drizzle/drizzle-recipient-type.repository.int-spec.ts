import { createDb, Db } from '../../../../shared/db';
import { DrizzleRecipientTypeRepository } from './drizzle-recipient-type.repository';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

// recipient_types is reference data seeded by migration 0024 — never truncated.
describe('DrizzleRecipientTypeRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleRecipientTypeRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleRecipientTypeRepository(db);
  });
  afterAll(async () => {
    await pool.end();
  });

  it('lists the seeded recipient types, ordered by sort, with bilingual labels', async () => {
    const types = await repo.list();
    const slugs = types.map((t) => t.slug);

    expect(slugs).toEqual(
      expect.arrayContaining(['hospital', 'individual', 'other']),
    );

    // ordered by sort ascending
    const sorts = types.map((t) => t.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));

    const hospital = types.find((t) => t.slug === 'hospital');
    expect(hospital?.labelEs).toBe('Hospital');
    expect(hospital?.labelEn).toBe('Hospital');
  });
});
