import { DomainEvent } from './domain-event';

export class ResourceRegistered implements DomainEvent {
  readonly eventName = 'resource.registered';
  readonly occurredOn = new Date();
  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      type: string;
      name: string;
    },
  ) {}
}
