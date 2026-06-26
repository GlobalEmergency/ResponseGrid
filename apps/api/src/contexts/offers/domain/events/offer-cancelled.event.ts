import { DomainEvent } from './domain-event';

export class OfferCancelled implements DomainEvent {
  readonly eventName = 'offer.cancelled';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
    },
  ) {}
}
