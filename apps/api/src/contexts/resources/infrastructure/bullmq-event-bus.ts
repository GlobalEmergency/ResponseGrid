import { Queue } from 'bullmq';
import { EventBus } from '../domain/ports/event-bus';
import { DomainEvent } from '../domain/events/domain-event';

// ponytail: publish-after-commit (caller persists, then calls publish). If we ever
// need exactly-once delivery, add a transactional outbox table; not worth it for the slice.
export class BullMqEventBus implements EventBus {
  constructor(private readonly queue: Queue) {}

  async publish(events: DomainEvent[]): Promise<void> {
    await this.queue.addBulk(
      events.map((e) => ({
        name: e.eventName,
        data: { name: e.eventName, occurredOn: e.occurredOn.toISOString(), aggregateId: e.aggregateId, payload: e.payload },
      })),
    );
  }
}
