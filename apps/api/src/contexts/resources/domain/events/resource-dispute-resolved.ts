import { DomainEvent } from './domain-event';

/**
 * Raised when a coordinator resolves a disputed resource: confirms the closure,
 * marks it invalid (rejected), or dismisses the citizen reports. `resolution`
 * carries which of those happened, for the activity trail.
 */
export class ResourceDisputeResolved implements DomainEvent {
  readonly eventName = 'resource.dispute_resolved';
  readonly occurredOn = new Date();
  constructor(
    readonly aggregateId: string,
    readonly payload: { emergencyId: string; resolution: string },
  ) {}
}
