import { DomainEvent } from './domain-event';

export class OfferMatched implements DomainEvent {
  readonly eventName = 'offer.matched';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      needId: string;
    },
  ) {}
}
