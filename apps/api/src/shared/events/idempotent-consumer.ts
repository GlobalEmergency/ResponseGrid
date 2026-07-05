import { DomainEventEnvelope } from './fan-out';

/**
 * Idempotency ledger port. `markIfNew` atomically records that `consumer` has
 * seen `dedupKey`, returning true only the first time (a Postgres
 * `INSERT ... ON CONFLICT DO NOTHING` in the real adapter).
 */
export interface ProcessedEventStore {
  markIfNew(consumer: string, dedupKey: string): Promise<boolean>;
}

/** Business dedup identity of an event copy: its name + the aggregate it concerns. */
export function dedupKey(event: DomainEventEnvelope): string {
  return `${event.name}:${event.aggregateId}`;
}

/**
 * Run `handler` at most once per (consumer, event). The shared queue is
 * at-least-once, so this guards against a redelivery double-applying.
 *
 * ponytail: marks *before* handling — a crash between the mark commit and the
 * handler completing drops the effect (at-most-once after claim), which for the
 * current handlers (inventory add, notification) is safer than the double-apply
 * a mark-after would risk. Upgrade path if a handler needs strict exactly-once:
 * make `markIfNew` share the handler's DB transaction so both commit atomically.
 */
export async function runOnce(
  consumer: string,
  event: DomainEventEnvelope,
  store: ProcessedEventStore,
  handler: (event: DomainEventEnvelope) => Promise<void>,
): Promise<'processed' | 'skipped'> {
  const isNew = await store.markIfNew(consumer, dedupKey(event));
  if (!isNew) return 'skipped';
  await handler(event);
  return 'processed';
}
