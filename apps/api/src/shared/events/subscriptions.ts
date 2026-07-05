/**
 * Domain-event subscription registry — the single place that maps event names
 * to the bounded contexts ("consumers") that react to them.
 *
 * Producers publish once to the shared `domain-events` queue; the dispatcher
 * (see `event-dispatcher.ts`) fans each event out to one queue per subscribed
 * consumer, so every consumer gets its own independent copy (its own retries,
 * idempotency and scaling) instead of competing for a single shared queue.
 *
 * Adding a consumer is a one-line change here plus its worker (OCP): no producer
 * ever needs to know who listens.
 */
export interface EventSubscription {
  /** Bounded-context name; also the suffix of its queue (`domain-events.<consumer>`). */
  readonly consumer: string;
  /** Event names this consumer wants delivered. */
  readonly events: readonly string[];
}

export const EVENT_SUBSCRIPTIONS: readonly EventSubscription[] = [
  { consumer: 'resources', events: ['donation_intake.received'] },
  { consumer: 'notifications', events: ['donation_intake.received'] },
];

/** Consumers subscribed to `eventName`, in registry order. */
export function consumersFor(
  eventName: string,
  subscriptions: readonly EventSubscription[] = EVENT_SUBSCRIPTIONS,
): string[] {
  return subscriptions
    .filter((s) => s.events.includes(eventName))
    .map((s) => s.consumer);
}

/** Distinct consumers across the registry — one private queue is created per entry. */
export function allConsumers(
  subscriptions: readonly EventSubscription[] = EVENT_SUBSCRIPTIONS,
): string[] {
  return [...new Set(subscriptions.map((s) => s.consumer))];
}

/** BullMQ queue name for a consumer's private fan-out queue. */
export function consumerQueueName(consumer: string): string {
  return `domain-events.${consumer}`;
}
