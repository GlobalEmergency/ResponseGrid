import { DomainEvent } from '../events/domain-event';

export const SHIPMENT_EVENT_BUS = Symbol('ShipmentEventBus');

/**
 * Output port for publishing shipment domain events. Mirrors the offers
 * context's EventBus; the in-memory fake collects them in tests and the BullMQ
 * adapter forwards them to the shared `domain-events` queue in production.
 */
export interface ShipmentEventBus {
  publish(events: DomainEvent[]): Promise<void>;
}
