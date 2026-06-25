// Seed script — inserts demo emergency data idempotently (ON CONFLICT DO NOTHING).
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
import { sql } from 'drizzle-orm';

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);

  try {
    await db
      .insert(emergenciesTable)
      .values({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Emergencia sísmica — Venezuela',
        slug: 'venezuela',
        country: 'VE',
        status: 'active',
        createdAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: emergenciesTable.id,
        set: {
          name: 'Emergencia sísmica — Venezuela',
          slug: 'venezuela',
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
