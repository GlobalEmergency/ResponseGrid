import { DomainEvent } from './domain-event';

export class OfferCreated implements DomainEvent {
  readonly eventName = 'offer.created';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      category: string;
    },
  ) {}
}
