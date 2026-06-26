import { DomainEvent } from './domain-event';

export class OfferFulfilled implements DomainEvent {
  readonly eventName = 'offer.fulfilled';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
    },
  ) {}
}
