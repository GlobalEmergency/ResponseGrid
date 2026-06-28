import { DomainEvent } from './domain-event';

/**
 * Raised when enough distinct citizens have reported a published resource as
 * invalid (closed / nonexistent / moved / outdated) for it to be flagged
 * "disputed" — it stays visible with a warning until a coordinator resolves it.
 */
export class ResourceDisputed implements DomainEvent {
  readonly eventName = 'resource.disputed';
  readonly occurredOn = new Date();
  constructor(
    readonly aggregateId: string,
    readonly payload: { emergencyId: string },
  ) {}
}
