import { SuggestCapacitiesForShipment } from './suggest-capacities-for-shipment';
import { ShipmentNotFoundError } from './shipment-not-found.error';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { InMemoryTransportCapacityRepository } from '../infrastructure/in-memory-transport-capacity.repository';
import { InMemoryResourceLocationLookup } from '../infrastructure/in-memory-resource-location-lookup';
import { FakeShipmentContainerPort } from '../infrastructure/fake-shipment-container-port';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { SupplyLineProps } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
import { TransportCapacity } from '../domain/transport-capacity';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportMode,
  TransportProviderType,
} from '../domain/transport-capacity-enums';
import { Capacity } from '../domain/capacity';
import { Coverage } from '../domain/coverage';
import { CapacityWindow } from '../domain/capacity-window';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const OTHER_NODE = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// Caracas-ish origin coordinates for proximity ranking
const ORIGIN_LAT = 10.4806;
const ORIGIN_LNG = -66.9036;

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

function makeCapacity(opts: {
  emergencyId?: string;
  mode?: TransportMode;
  capacity?: Capacity;
  coverage?: Coverage;
  window?: CapacityWindow;
  constraints?: string[];
  withdrawn?: boolean;
}): TransportCapacity {
  const cap = TransportCapacity.publish({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(opts.emergencyId ?? EM),
    provider: { type: TransportProviderType.Organization, id: PROVIDER_ID },
    mode: opts.mode ?? TransportMode.Road,
    capacity: opts.capacity ?? Capacity.create({ weightKg: 1000, volumeM3: 8 }),
    coverage:
      opts.coverage ??
      Coverage.corridor({
        originResourceId: ORIGIN,
        destinationResourceId: DEST,
        originLat: null,
        originLng: null,
        destinationLat: null,
        destinationLng: null,
      }),
    window: opts.window ?? CapacityWindow.empty(),
    constraints: opts.constraints ?? [],
    notes: null,
  });
  if (opts.withdrawn) cap.withdraw();
  return cap;
}

async function seedShipment(
  shipments: InMemoryShipmentRepository,
  opts?: { items?: SupplyLineProps[] },
): Promise<string> {
  const { id } = await new CreateShipment(
    shipments,
    new FakeStatusReader(),
    new FakeShipmentContainerPort(),
  ).execute({
    emergencyId: EM,
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    items: opts?.items ?? [
      { name: 'agua', quantity: 5, unit: null, category: Category.Water },
    ],
    containerIds: [],
    manifest: null,
  });
  return id;
}

function buildUseCase(
  shipments: InMemoryShipmentRepository,
  capacities: InMemoryTransportCapacityRepository,
  lookup: InMemoryResourceLocationLookup,
): SuggestCapacitiesForShipment {
  return new SuggestCapacitiesForShipment(shipments, capacities, lookup);
}

describe('SuggestCapacitiesForShipment', () => {
  let shipments: InMemoryShipmentRepository;
  let capacities: InMemoryTransportCapacityRepository;
  let lookup: InMemoryResourceLocationLookup;

  beforeEach(() => {
    shipments = new InMemoryShipmentRepository();
    capacities = new InMemoryTransportCapacityRepository();
    lookup = new InMemoryResourceLocationLookup();
    lookup.set(ORIGIN, { latitude: ORIGIN_LAT, longitude: ORIGIN_LNG });
  });

  it('throws ShipmentNotFoundError for an unknown shipment', async () => {
    const useCase = buildUseCase(shipments, capacities, lookup);
    await expect(
      useCase.execute({
        shipmentId: '99999999-9999-4999-8999-999999999999',
      }),
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('returns available capacities of the same emergency', async () => {
    const shipmentId = await seedShipment(shipments);
    await capacities.save(makeCapacity({}));
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(1);
    expect(result[0].emergencyId).toBe(EM);
  });

  it('excludes capacities of a different emergency', async () => {
    const shipmentId = await seedShipment(shipments);
    await capacities.save(makeCapacity({}));
    await capacities.save(makeCapacity({ emergencyId: OTHER_EM }));
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(1);
    expect(result[0].emergencyId).toBe(EM);
  });

  it('excludes capacities that are not available (withdrawn)', async () => {
    const shipmentId = await seedShipment(shipments);
    await capacities.save(makeCapacity({}));
    await capacities.save(makeCapacity({ withdrawn: true }));
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(1);
  });

  it('does NOT filter on capacity size when the shipment carries no weight/volume', async () => {
    const shipmentId = await seedShipment(shipments);
    // A tiny capacity that would fail a size filter if one were applied.
    await capacities.save(
      makeCapacity({ capacity: Capacity.create({ weightKg: 1, volumeM3: 1 }) }),
    );
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(1);
  });

  it('does NOT filter on mode (the shipment specifies none today)', async () => {
    const shipmentId = await seedShipment(shipments);
    await capacities.save(makeCapacity({ mode: TransportMode.Road }));
    await capacities.save(makeCapacity({ mode: TransportMode.Air }));
    await capacities.save(makeCapacity({ mode: TransportMode.Sea }));
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(3);
  });

  it('ranks corridor capacities whose endpoints match the shipment nodes above area capacities', async () => {
    const shipmentId = await seedShipment(shipments);
    // Area capacity (weaker coverage match)
    await capacities.save(
      makeCapacity({ coverage: Coverage.area('Estado Vargas') }),
    );
    // Corridor capacity matching the exact nodes (strong match)
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: ORIGIN,
          destinationResourceId: DEST,
          originLat: null,
          originLng: null,
          destinationLat: null,
          destinationLng: null,
        }),
      }),
    );
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(2);
    expect(result[0].coverage.kind).toBe('corridor');
    expect(result[1].coverage.kind).toBe('area');
  });

  it('ranks corridor capacities by proximity of their origin to the shipment origin', async () => {
    const shipmentId = await seedShipment(shipments);
    // Far corridor (origin ~hundreds of km away), no resourceId match
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: null,
          destinationResourceId: null,
          originLat: 8.0,
          originLng: -63.0,
          destinationLat: 8.5,
          destinationLng: -63.5,
        }),
      }),
    );
    // Near corridor (origin ~1km away), no resourceId match
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: null,
          destinationResourceId: null,
          originLat: 10.49,
          originLng: -66.903,
          destinationLat: 10.6,
          destinationLng: -67.0,
        }),
      }),
    );
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(2);
    const nearOriginLat = (result[0].coverage as { originLat: number })
      .originLat;
    expect(nearOriginLat).toBe(10.49);
  });

  it('ranks an exact resourceId corridor match above a closer-by-coords corridor', async () => {
    const shipmentId = await seedShipment(shipments);
    // Corridor with coords very close to origin but NO resourceId match
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: OTHER_NODE,
          destinationResourceId: null,
          originLat: ORIGIN_LAT,
          originLng: ORIGIN_LNG,
          destinationLat: 10.6,
          destinationLng: -67.0,
        }),
      }),
    );
    // Corridor matching the exact origin resourceId but with far coords
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: ORIGIN,
          destinationResourceId: DEST,
          originLat: 5.0,
          originLng: -60.0,
          destinationLat: 5.5,
          destinationLng: -60.5,
        }),
      }),
    );
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(2);
    expect(
      (result[0].coverage as { originResourceId: string }).originResourceId,
    ).toBe(ORIGIN);
  });

  it('sorts capacities without resolvable coords last', async () => {
    const shipmentId = await seedShipment(shipments);
    // Corridor with coords near origin (resolvable)
    await capacities.save(
      makeCapacity({
        coverage: Coverage.corridor({
          originResourceId: null,
          destinationResourceId: null,
          originLat: 10.49,
          originLng: -66.903,
          destinationLat: 10.6,
          destinationLng: -67.0,
        }),
      }),
    );
    // Area coverage: no coords, no node match -> unresolvable -> last
    await capacities.save(
      makeCapacity({ coverage: Coverage.area('Estado Vargas') }),
    );
    const useCase = buildUseCase(shipments, capacities, lookup);

    const result = await useCase.execute({ shipmentId });
    expect(result).toHaveLength(2);
    expect(result[0].coverage.kind).toBe('corridor');
    expect(result[1].coverage.kind).toBe('area');
  });
});
