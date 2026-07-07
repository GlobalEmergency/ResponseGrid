import { ShipmentEventBus } from '../domain/ports/shipment-event-bus';
import { DomainEvent } from '@globalemergency/warehouse-core/kernel';

export class FakeShipmentEventBus implements ShipmentEventBus {
  public published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }
}
