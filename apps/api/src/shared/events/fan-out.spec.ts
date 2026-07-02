import { fanOut, DomainEventEnvelope } from './fan-out';
import { EventSubscription } from './subscriptions';

const SUBS: EventSubscription[] = [
  { consumer: 'resources', events: ['donation_intake.received'] },
  { consumer: 'notifications', events: ['donation_intake.received'] },
];

const event = (name: string): DomainEventEnvelope => ({
  name,
  occurredOn: '2026-07-01T00:00:00.000Z',
  aggregateId: 'agg-1',
  payload: { foo: 'bar' },
});

describe('fanOut', () => {
  it('enqueues one copy of the event per subscribed consumer', async () => {
    const calls: Array<{ consumer: string; event: DomainEventEnvelope }> = [];
    const enqueue = (
      consumer: string,
      e: DomainEventEnvelope,
    ): Promise<void> => {
      calls.push({ consumer, event: e });
      return Promise.resolve();
    };

    const dispatched = await fanOut(
      event('donation_intake.received'),
      enqueue,
      SUBS,
    );

    expect(dispatched).toBe(2);
    expect(calls.map((c) => c.consumer).sort()).toEqual([
      'notifications',
      'resources',
    ]);
    expect(calls[0].event.payload).toEqual({ foo: 'bar' });
  });

  it('enqueues nothing for an event without subscribers', async () => {
    const calls: string[] = [];
    const dispatched = await fanOut(
      event('need.created'),
      (consumer): Promise<void> => {
        calls.push(consumer);
        return Promise.resolve();
      },
      SUBS,
    );

    expect(dispatched).toBe(0);
    expect(calls).toEqual([]);
  });
});
