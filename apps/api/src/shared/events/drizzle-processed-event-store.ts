import { Db } from '../db';
import { ProcessedEventStore } from './idempotent-consumer';
import { processedEventsTable } from './processed-events-schema';

/**
 * Postgres-backed idempotency ledger. `markIfNew` relies on the primary key +
 * `ON CONFLICT DO NOTHING`: the insert either records the pair (returns a row)
 * or is a no-op on a redelivery (returns nothing) — atomic, no read-then-write
 * race.
 */
export class DrizzleProcessedEventStore implements ProcessedEventStore {
  constructor(private readonly db: Db) {}

  async markIfNew(consumer: string, dedupKey: string): Promise<boolean> {
    const inserted = await this.db
      .insert(processedEventsTable)
      .values({ consumer, dedupKey })
      .onConflictDoNothing()
      .returning({ consumer: processedEventsTable.consumer });
    return inserted.length > 0;
  }
}
