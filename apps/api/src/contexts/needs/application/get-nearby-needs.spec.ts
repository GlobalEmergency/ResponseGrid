import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { GetNearbyNeeds } from './get-nearby-needs';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, Category } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';

const EM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

// Caracas origin point
const ORIGIN_LAT = 10.4806;
const ORIGIN_LNG = -66.9036;

function makeValidated(
  title: string,
  lat: number,
  lng: number,
  sensitivity: LocationSensitivity = LocationSensitivity.Public,
): Need {
  const need = Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title,
    description: null,
    location: Location.create({
      address: `${title} address`,
      latitude: lat,
      longitude: lng,
    }),
    priority: Priority.High,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    locationSensitivity: sensitivity,
    items: [
      SupplyLine.create({
        name: 'Water',
        quantity: 10,
        unit: 'liters',
        category: Category.Water,
      }),
    ],
  });
  need.validate();
  return need;
}

describe('GetNearbyNeeds', () => {
  it('returns validated needs within radius, each with a distanceMeters', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNearbyNeeds(repo);

    await repo.save(makeValidated('At origin', ORIGIN_LAT, ORIGIN_LNG));

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('At origin');
    expect(typeof result.items[0].distanceMeters).toBe('number');
    expect(result.items[0].distanceMeters).toBeGreaterThanOrEqual(0);
    expect(result.items[0].items).toHaveLength(1);
  });

  it('orders needs by ascending distance', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNearbyNeeds(repo);

    await repo.save(makeValidated('Medium', 10.49, -66.903)); // ~1.3 km
    await repo.save(makeValidated('Near', ORIGIN_LAT, ORIGIN_LNG)); // ~0 km

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 10000,
      limit: 10,
    });

    expect(result.items.map((n) => n.title)).toEqual(['Near', 'Medium']);
    expect(result.items[0].distanceMeters).toBeLessThanOrEqual(
      result.items[1].distanceMeters,
    );
  });

  it('returns empty array when no needs are within radius', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNearbyNeeds(repo);

    await repo.save(makeValidated('Far', 10.8, -66.9)); // ~35 km

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(0);
  });

  it('excludes needs that are not validated (e.g. pending)', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNearbyNeeds(repo);

    // validated → included
    await repo.save(makeValidated('Validated', ORIGIN_LAT, ORIGIN_LNG));
    // pending (no validate()) → excluded
    const pending = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Pending',
      description: null,
      location: Location.create({
        address: 'Pending address',
        latitude: ORIGIN_LAT,
        longitude: ORIGIN_LNG,
      }),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Water',
          quantity: 10,
          unit: 'liters',
          category: Category.Water,
        }),
      ],
    });
    await repo.save(pending);

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Validated');
  });

  it('does NOT expose an exact distance for approximate-location needs (privacy)', async () => {
    const repo = new InMemoryNeedRepository();
    const useCase = new GetNearbyNeeds(repo);

    // A sensitive need located EXACTLY at the query point. Because its public
    // view jitters the coordinates, the exposed distance is derived from the
    // jittered point and must therefore be strictly greater than 0.
    await repo.save(
      makeValidated(
        'Sensitive',
        ORIGIN_LAT,
        ORIGIN_LNG,
        LocationSensitivity.Approximate,
      ),
    );

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.locationSensitivity).toBe('approximate');
    // Exposed distance comes from the jittered point (≤ 300 m jitter radius).
    expect(item.distanceMeters).toBeGreaterThan(0);
    expect(item.distanceMeters).toBeLessThanOrEqual(350);
    // The exposed coordinates are not the exact origin.
    const movedLat = item.location.latitude !== ORIGIN_LAT;
    const movedLng = item.location.longitude !== ORIGIN_LNG;
    expect(movedLat || movedLng).toBe(true);
  });
});
