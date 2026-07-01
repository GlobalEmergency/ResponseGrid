import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';

/** Idempotency ledger: (consumer, dedup_key) → already processed. Migration 0048. */
export const processedEventsTable = pgTable(
  'processed_events',
  {
    consumer: text('consumer').notNull(),
    dedupKey: text('dedup_key').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.consumer, t.dedupKey] })],
);
