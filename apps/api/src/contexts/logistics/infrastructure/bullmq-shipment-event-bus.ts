import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ShipmentEventBus } from '../domain/ports/shipment-event-bus';
import { DomainEvent } from '../domain/events/domain-event';

/**
 * Forwards shipment domain events to the shared `domain-events` BullMQ queue
 * (same queue the offers context uses). Fail-open: the aggregate is already
 * persisted (publish-after-commit), so a broker outage must not fail the write.
 */
export class BullMqShipmentEventBus implements ShipmentEventBus {
  private readonly logger = new Logger(BullMqShipmentEventBus.name);

  constructor(private readonly queue: Queue) {}

  async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
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
      this.logger.error(
        `Failed to publish ${events.length} shipment event(s); continuing without them`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
