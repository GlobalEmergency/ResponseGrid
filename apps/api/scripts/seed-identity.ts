// Seed script — inserts demo identity data idempotently.
//
// Creates:
//   - admin@reliefhub.org / admin1234  (isAdmin = true)
//   - coord@reliefhub.org / coord1234  (isAdmin = false)
//     └─ coordinator membership in emergency 11111111-1111-4111-8111-111111111111 (venezuela)
//
// Usage (from repo root):
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     ts-node --transpile-only apps/api/scripts/seed-identity.ts
//
// Or from apps/api/:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only scripts/seed-identity.ts

import * as bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { createDb } from '../src/shared/db';
import { usersTable, membershipsTable } from '../src/contexts/identity/infrastructure/drizzle/schema';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ADMIN_EMAIL = 'admin@reliefhub.org';
const ADMIN_PASSWORD = 'admin1234';

const COORD_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COORD_EMAIL = 'coord@reliefhub.org';
const COORD_PASSWORD = 'coord1234';

const VENEZUELA_EM_ID = '11111111-1111-4111-8111-111111111111';
const COORD_MEMBERSHIP_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);

  try {
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const coordHash = await bcrypt.hash(COORD_PASSWORD, 10);

    // Upsert admin user — clean up any stale row with same email but different id
    await db.delete(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
    await db
      .insert(usersTable)
      .values({
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        name: 'Admin ReliefHub',
        isAdmin: true,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { name: 'Admin ReliefHub', isAdmin: true },
      });
    console.log(`Seed: admin user upserted (${ADMIN_EMAIL})`);

    // Upsert coordinator user — clean up any stale row with the same email but different id
    await db.delete(usersTable).where(eq(usersTable.email, COORD_EMAIL));
    await db
      .insert(usersTable)
      .values({
        id: COORD_ID,
        email: COORD_EMAIL,
        passwordHash: coordHash,
        name: 'Coordinator Venezuela',
        isAdmin: false,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { name: 'Coordinator Venezuela', isAdmin: false },
      });
    console.log(`Seed: coordinator user upserted (${COORD_EMAIL})`);

    // Upsert coordinator membership for venezuela emergency
    const existingByUserAndEmergency = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, COORD_ID));

    const alreadyHasMembership = existingByUserAndEmergency.some(
      (m) => m.emergencyId === VENEZUELA_EM_ID && m.role === 'coordinator',
    );

    if (!alreadyHasMembership) {
      await db
        .insert(membershipsTable)
        .values({
          id: COORD_MEMBERSHIP_ID,
          userId: COORD_ID,
          emergencyId: VENEZUELA_EM_ID,
          role: 'coordinator',
        })
        .onConflictDoUpdate({
          target: [membershipsTable.userId, membershipsTable.emergencyId, membershipsTable.role],
          set: { role: 'coordinator' },
        });
    }
    console.log(`Seed: coordinator membership upserted for emergency ${VENEZUELA_EM_ID}`);

    console.log('\nSeed complete.');
    console.log('  Admin:       admin@reliefhub.org / admin1234  (isAdmin=true)');
    console.log('  Coordinator: coord@reliefhub.org / coord1234  (coordinator in venezuela)');
  } finally {
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
