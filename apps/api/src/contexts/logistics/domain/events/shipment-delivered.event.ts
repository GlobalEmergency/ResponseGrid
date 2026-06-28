import { DomainEvent } from './domain-event';

/**
 * Emitted when a shipment's delivery is confirmed (in_transit → delivered).
 *
 * Carries the route endpoints and the manifest so future consumers can react:
 * recipient-receptions (#67) and inventory at the destination node. Those
 * features do not exist yet — this context only DEFINES and EMITS the event via
 * the shared DomainEvent kernel; no cross-context wiring is implied.
 */
export class ShipmentDelivered implements DomainEvent {
  readonly eventName = 'shipment.delivered';
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly payload: {
      emergencyId: string;
      originResourceId: string;
      destinationResourceId: string;
      assignedCapacityId: string | null;
      carrierType: string | null;
      carrierId: string | null;
    },
  ) {}
}
