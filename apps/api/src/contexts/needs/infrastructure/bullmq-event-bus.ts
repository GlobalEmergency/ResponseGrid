import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventBus } from '../domain/ports/event-bus';
import { DomainEvent } from '../domain/events/domain-event';

export class BullMqEventBus implements EventBus {
  private readonly logger = new Logger(BullMqEventBus.name);

  constructor(private readonly queue: Queue) {}

  async publish(events: DomainEvent[]): Promise<void> {
    try {
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
    } catch (err) {
      // Fail-open: the aggregate is already persisted (publish-after-commit), so a
      // broker outage (e.g. Redis down) must not fail the user's write. Best-effort
      // side-effect events are dropped and logged loudly instead of propagating a 500.
      this.logger.error(
        `Failed to publish ${events.length} domain event(s); continuing without them`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
