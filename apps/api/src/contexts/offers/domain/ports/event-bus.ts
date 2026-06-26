import { DomainEvent } from '../events/domain-event';

export const OFFER_EVENT_BUS = Symbol('OffersEventBus');

export interface EventBus {
  publish(events: DomainEvent[]): Promise<void>;
}
