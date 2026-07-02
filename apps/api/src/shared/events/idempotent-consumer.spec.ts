import { runOnce, dedupKey, ProcessedEventStore } from './idempotent-consumer';
import { DomainEventEnvelope } from './fan-out';

class InMemoryProcessedEventStore implements ProcessedEventStore {
  private readonly seen = new Set<string>();
  markIfNew(consumer: string, key: string): Promise<boolean> {
    const composite = `${consumer} ${key}`;
    if (this.seen.has(composite)) return Promise.resolve(false);
    this.seen.add(composite);
    return Promise.resolve(true);
  }
}

const event = (aggregateId: string): DomainEventEnvelope => ({
  name: 'donation_intake.received',
  occurredOn: '2026-07-01T00:00:00.000Z',
  aggregateId,
  payload: {},
});

/** Handler that just counts invocations, without an unused `async`. */
const countingHandler = (counter: { runs: number }) => (): Promise<void> => {
  counter.runs++;
  return Promise.resolve();
};

describe('runOnce', () => {
  it('runs the handler and reports processed on first delivery', async () => {
    const store = new InMemoryProcessedEventStore();
    const counter = { runs: 0 };
    const result = await runOnce(
      'resources',
      event('a'),
      store,
      countingHandler(counter),
    );
    expect(result).toBe('processed');
    expect(counter.runs).toBe(1);
  });

  it('skips the handler on a redelivery of the same event', async () => {
    const store = new InMemoryProcessedEventStore();
    const counter = { runs: 0 };
    const handler = countingHandler(counter);
    await runOnce('resources', event('a'), store, handler);
    const second = await runOnce('resources', event('a'), store, handler);
    expect(second).toBe('skipped');
    expect(counter.runs).toBe(1);
  });

  it('processes the same event independently per consumer', async () => {
    const store = new InMemoryProcessedEventStore();
    const counter = { runs: 0 };
    const handler = countingHandler(counter);
    await runOnce('resources', event('a'), store, handler);
    const other = await runOnce('notifications', event('a'), store, handler);
    expect(other).toBe('processed');
    expect(counter.runs).toBe(2);
  });

  it('keys dedup by event name and aggregate id', () => {
    expect(dedupKey(event('a'))).toBe('donation_intake.received:a');
  });
});
