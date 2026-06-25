// Seed script — inserts demo emergency data idempotently.
//
// The seed ensures the canonical Venezuela emergency always exists with the
// fixed UUID used by the frontend demo. It handles two conflict scenarios:
//   1. Row exists with same id → upsert updates name/slug/country/status.
//   2. Row exists with same slug but different id (e.g. created via API) →
//      that row is deleted first so the canonical id always wins.
//
// Usage:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     ts-node --transpile-only apps/api/scripts/seed-emergencies.ts
//
// Or from apps/api directory:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only scripts/seed-emergencies.ts

import { createDb } from '../src/shared/db';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import { and, eq, ne, sql } from 'drizzle-orm';

const SEED_ID = '11111111-1111-4111-8111-111111111111';
const SEED_SLUG = 'venezuela';

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);

  try {
    // Delete any conflicting row that has the same slug but a different id.
    // This prevents a unique-violation on the slug column when the canonical
    // id row doesn't exist yet but a differently-keyed row already owns the slug.
    await db
      .delete(emergenciesTable)
      .where(and(eq(emergenciesTable.slug, SEED_SLUG), ne(emergenciesTable.id, SEED_ID)));

    // Upsert by primary key — safe now that no slug conflict can exist.
    await db
      .insert(emergenciesTable)
      .values({
        id: SEED_ID,
        name: 'Emergencia sísmica — Venezuela',
        slug: SEED_SLUG,
        country: 'VE',
        status: 'active',
        createdAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: emergenciesTable.id,
        set: {
          name: 'Emergencia sísmica — Venezuela',
          slug: SEED_SLUG,
          country: 'VE',
          status: 'active',
        },
      });

    console.log('Seed completed: emergency "venezuela" upserted.');
  } finally {
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
