import {
  consumersFor,
  consumerQueueName,
  EventSubscription,
  EVENT_SUBSCRIPTIONS,
} from './subscriptions';

/** Serialized domain event as it travels on the queue. */
export interface DomainEventEnvelope {
  name: string;
  occurredOn: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export type Enqueue = (
  consumer: string,
  event: DomainEventEnvelope,
) => Promise<void>;

/**
 * Fan an event out to every subscribed consumer's queue. Pure routing: the
 * transport is injected via `enqueue`, so this is unit-tested without Redis.
 * Returns how many consumer copies were enqueued.
 */
export async function fanOut(
  event: DomainEventEnvelope,
  enqueue: Enqueue,
  subscriptions: readonly EventSubscription[] = EVENT_SUBSCRIPTIONS,
): Promise<number> {
  const consumers = consumersFor(event.name, subscriptions);
  for (const consumer of consumers) {
    await enqueue(consumer, event);
  }
  return consumers.length;
}

export { consumerQueueName };
