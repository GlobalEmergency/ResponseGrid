import { Queue } from 'bullmq';
import { EventBus } from '../domain/ports/event-bus';
import { DomainEvent } from '../domain/events/domain-event';

export class BullMqOfferEventBus implements EventBus {
  constructor(private readonly queue: Queue) {}

  async publish(events: DomainEvent[]): Promise<void> {
    await this.queue.addBulk(
      events.map((e) => ({
        name: e.eventName,
        data: {
          name: e.eventName,
          occurredOn: e.occurredOn.toISOString(),
          aggregateId: e.aggregateId,
          payload: e.payload,
        },
      })),
    );
  }
}
