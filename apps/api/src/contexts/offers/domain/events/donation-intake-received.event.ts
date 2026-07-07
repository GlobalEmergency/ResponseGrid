import { DomainEvent } from './domain-event';
import { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';

export class DonationIntakeReceived implements DomainEvent {
  readonly eventName = 'donation_intake.received';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      targetResourceId: string;
      receivedByUserId: string;
      /** Donor's platform user id, when the donation is linked to one (#129). */
      donorUserId: string | null;
      lines: SupplyLineSnapshot[];
    },
  ) {}
}
