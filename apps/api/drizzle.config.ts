import type { Config } from 'drizzle-kit';
export default {
  schema: [
    './src/contexts/resources/infrastructure/drizzle/schema.ts',
    './src/contexts/emergencies/infrastructure/drizzle/schema.ts',
    './src/contexts/identity/infrastructure/drizzle/schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
