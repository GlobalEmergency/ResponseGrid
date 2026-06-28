import type { Config } from 'drizzle-kit';

// NOTE: drizzle-kit generate/migrate hangs in Git Bash / Windows pseudo-ttys.
// Apply SQL migrations manually via:
//   docker exec -i reliefhub-postgres-1 psql -U postgres -d reliefhub < apps/api/drizzle/<file>.sql
// The e2e global-setup applies all drizzle/*.sql files automatically.
// This array must stay in sync whenever a new context adds a Drizzle schema.

export default {
  schema: [
    // Core contexts (original)
    './src/contexts/resources/infrastructure/drizzle/schema.ts',
    './src/contexts/emergencies/infrastructure/drizzle/schema.ts',
    './src/contexts/identity/infrastructure/drizzle/schema.ts',
    './src/contexts/needs/infrastructure/drizzle/schema.ts',
    './src/contexts/organizations/infrastructure/drizzle/schema.ts',
    './src/contexts/accreditation/infrastructure/drizzle/schema.ts',
    './src/contexts/volunteers/infrastructure/drizzle/schema.ts',
    // Extended contexts (added after initial baseline)
    './src/contexts/volunteers/infrastructure/drizzle/task-schema.ts',
    './src/contexts/offers/infrastructure/drizzle/schema.ts',
    './src/contexts/reports/infrastructure/drizzle/schema.ts',
    './src/contexts/templates/infrastructure/drizzle/schema.ts',
    './src/contexts/notifications/infrastructure/drizzle/schema.ts',
    './src/contexts/audit/infrastructure/drizzle/schema.ts',
    // Supplies context (categories + aliases)
    './src/contexts/supplies/infrastructure/drizzle/schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
