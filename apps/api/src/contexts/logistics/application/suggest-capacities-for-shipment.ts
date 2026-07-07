import { ShipmentRepository } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityRepository } from '@globalemergency/warehouse-core/logistics';
import { ResourceLocationLookup } from '../domain/ports/resource-location-lookup';
import { ShipmentId } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityStatus } from '@globalemergency/warehouse-core/logistics';
import { deriveShipmentMatchCriteria } from '@globalemergency/warehouse-core/logistics';
import {
  capacityMatchesShipment,
  rankCapacitiesForShipment,
  OriginLatLng,
} from '@globalemergency/warehouse-core/logistics';
import { CapacityView, toCapacityView } from './capacity-view';
import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { ShipmentNotFoundError } from './shipment-not-found.error';

export interface SuggestCapacitiesForShipmentQuery {
  shipmentId: string;
}

/**
 * #107 — closes the logistics loop: given a Shipment that must move cargo A→B,
 * suggest the compatible {@link TransportCapacity} offers (#105), ranked. The
 * logistics analogue of offer↔need matching.
 *
 * 1. Load the shipment → derive its match criteria (mode/load/window/constraints
 *    — all open today; see {@link deriveShipmentMatchCriteria}).
 * 2. Load the emergency's AVAILABLE capacities and keep the compatible ones.
 * 3. Resolve the shipment origin coordinates once and rank by proximity/coverage.
 */
export class SuggestCapacitiesForShipment {
  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly capacityRepo: TransportCapacityRepository,
    private readonly resourceLocationLookup: ResourceLocationLookup,
  ) {}

  async execute(
    query: SuggestCapacitiesForShipmentQuery,
  ): Promise<CapacityView[]> {
    const shipment = await this.shipmentRepo.findById(
      ShipmentId.fromString(query.shipmentId),
    );
    if (shipment === null) {
      throw new ShipmentNotFoundError(query.shipmentId);
    }

    const criteria = deriveShipmentMatchCriteria(shipment);

    const available = await this.capacityRepo.findByScope(shipment.scopeId, {
      status: TransportCapacityStatus.Available,
    });

    const compatible = available.filter((capacity: TransportCapacity) =>
      capacityMatchesShipment(capacity.toSnapshot(), criteria),
    );

    const origin = await this.resolveOrigin(criteria.originResourceId);

    const ranked = rankCapacitiesForShipment(
      compatible.map((c) => c.toSnapshot()),
      criteria,
      origin,
    );

    return ranked.map((r) =>
      toCapacityView(TransportCapacity.fromSnapshot(r.capacity)),
    );
  }

  private async resolveOrigin(
    originResourceId: string,
  ): Promise<OriginLatLng | null> {
    const latLng =
      await this.resourceLocationLookup.findLatLng(originResourceId);
    return latLng === null
      ? null
      : { latitude: latLng.latitude, longitude: latLng.longitude };
  }
}
