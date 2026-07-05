import type { Pool } from 'pg';
import { createDb, Db } from '../db';
import { DrizzleProcessedEventStore } from './drizzle-processed-event-store';
import { processedEventsTable } from './processed-events-schema';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

describe('DrizzleProcessedEventStore (integration)', () => {
  let db: Db;
  let pool: Pool;
  let store: DrizzleProcessedEventStore;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    store = new DrizzleProcessedEventStore(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(processedEventsTable);
  });

  it('records a new (consumer, key) once and rejects the redelivery', async () => {
    expect(await store.markIfNew('resources', 'e:1')).toBe(true);
    expect(await store.markIfNew('resources', 'e:1')).toBe(false);
  });

  it('tracks the same key independently per consumer', async () => {
    expect(await store.markIfNew('resources', 'e:1')).toBe(true);
    expect(await store.markIfNew('notifications', 'e:1')).toBe(true);
  });
});
