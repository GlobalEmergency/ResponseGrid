import { DomainEvent } from './domain-event';
import { SupplyLineSnapshot } from '../../../supplies/domain/supply-line';

export class DonationIntakeReceived implements DomainEvent {
  readonly eventName = 'donation_intake.received';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      targetResourceId: string;
      receivedByUserId: string;
      lines: SupplyLineSnapshot[];
    },
  ) {}
}
