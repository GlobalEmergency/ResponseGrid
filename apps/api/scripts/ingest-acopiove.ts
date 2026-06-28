// One-off ingest script — pulls https://acopiove.org/api/centros and upserts
// all records into the DEV database using the idempotent IngestExternalResources
// pipeline (Task 3).
//
// Preconditions (must be met before running):
//   1. Dev containers up: docker compose up -d postgres redis
//   2. Migrations applied (0017/0018) – already done on this branch.
//   3. Taxonomy seeded: run seed-taxonomy.ts first (category_aliases required).
//   4. Emergency seeded (optional but recommended for FK accuracy): seed-emergencies.ts
//
// Usage (from repo root):
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     ts-node --transpile-only apps/api/scripts/ingest-acopiove.ts
//
// Or from apps/api/:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only scripts/ingest-acopiove.ts

import { createDb } from '../src/shared/db';
import { DrizzleResourceRepository } from '../src/contexts/resources/infrastructure/drizzle/drizzle-resource.repository';
import { DrizzleCategoryRepository } from '../src/contexts/supplies/infrastructure/drizzle/drizzle-category.repository';
import { CategoryResolver } from '../src/contexts/supplies/domain/category-resolver';
import { IngestExternalResources } from '../src/contexts/resources/application/ingest-external-resources';
import { acopioveMapper } from '../src/contexts/resources/application/acopiove-mapper';

const EMERGENCY_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_USER_ID = 'f0ec30d5-6f09-4afe-a97b-20a24681a02b';
const SOURCE_NAME = 'acopiove.org';
const ACOPIOVE_URL = 'https://acopiove.org/api/centros';

async function run(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  console.log(`[ingest-acopiove] Connecting to DB…`);
  const { db, pool } = createDb(url);

  try {
    // 1. Fetch remote data
    console.log(`[ingest-acopiove] Fetching ${ACOPIOVE_URL} …`);
    const response = await fetch(ACOPIOVE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} from ${ACOPIOVE_URL}`);
    }
    const records: unknown[] = await response.json() as unknown[];
    console.log(`[ingest-acopiove] Fetched ${records.length} records.`);

    // 2. Build infrastructure dependencies (hexagonal: no Nest, just drizzle)
    const categoryRepo = new DrizzleCategoryRepository(db);
    const aliasMap = await categoryRepo.loadAliasMap();
    console.log(`[ingest-acopiove] Alias map loaded: ${aliasMap.size} entries.`);

    const categoryResolver = new CategoryResolver(aliasMap);
    const resourceRepo = new DrizzleResourceRepository(db);
    const ingest = new IngestExternalResources(resourceRepo, categoryResolver);

    // 3. Run ingest pipeline
    console.log(`[ingest-acopiove] Running ingest pipeline…`);
    const result = await ingest.execute({
      emergencyId: EMERGENCY_ID,
      sourceName: SOURCE_NAME,
      ownerUserId: OWNER_USER_ID,
      records,
      mapper: acopioveMapper,
    });

    console.log(`[ingest-acopiove] DONE.`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
    console.log(`[ingest-acopiove] Pool closed.`);
  }
}

run().catch((err: unknown) => {
  console.error('[ingest-acopiove] FAILED:', err);
  process.exit(1);
});
