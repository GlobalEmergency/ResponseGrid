import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { GetNearbyResources } from './get-nearby-resources';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../domain/resource-enums';
import { Location } from '../../../shared/domain/location';

const EM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OWNER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

// Caracas origin point
const ORIGIN_LAT = 10.4806;
const ORIGIN_LNG = -66.9036;

const makeVisible = (
  name: string,
  lat: number,
  lng: number,
  status: PublicStatus = PublicStatus.Active,
) =>
  Resource.fromSnapshot({
    ...Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name,
      location: Location.create({
        address: `${name} address`,
        latitude: lat,
        longitude: lng,
      }),
      ownerUserId: OWNER_ID,
    }).toSnapshot(),
    verificationLevel: VerificationLevel.Verified,
    publicStatus: status,
    createdAt: new Date(),
  });

describe('GetNearbyResources', () => {
  it('returns items with distanceMeters for visible resources within radius', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new GetNearbyResources(repo);

    // At origin (~0m)
    await repo.save(makeVisible('Near', ORIGIN_LAT, ORIGIN_LNG));

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(typeof result.items[0].distanceMeters).toBe('number');
    expect(result.items[0].distanceMeters).toBeGreaterThanOrEqual(0);
    expect(result.items[0].name).toBe('Near');
  });

  it('returns empty array when no resources are within radius', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new GetNearbyResources(repo);

    // ~35km away from origin
    await repo.save(makeVisible('Far', 10.8, -66.9));

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(0);
  });

  it('returns items ordered by distance ascending', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new GetNearbyResources(repo);

    // ~1.3km away
    await repo.save(makeVisible('Medium', 10.49, -66.903));
    // ~0m away
    await repo.save(makeVisible('Near', ORIGIN_LAT, ORIGIN_LNG));

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 10000,
      limit: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Near');
    expect(result.items[1].name).toBe('Medium');
    expect(result.items[0].distanceMeters).toBeLessThanOrEqual(
      result.items[1].distanceMeters,
    );
  });

  it('excludes hidden resources', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new GetNearbyResources(repo);

    await repo.save(makeVisible('Visible', ORIGIN_LAT, ORIGIN_LNG));
    await repo.save(
      makeVisible('Hidden', ORIGIN_LAT, ORIGIN_LNG, PublicStatus.Hidden),
    );
    await repo.save(
      makeVisible('Closed', ORIGIN_LAT, ORIGIN_LNG, PublicStatus.Closed),
    );

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Visible');
  });

  it('includes Saturated and Paused visible resources', async () => {
    const repo = new InMemoryResourceRepository();
    const useCase = new GetNearbyResources(repo);

    await repo.save(
      makeVisible('Active', ORIGIN_LAT, ORIGIN_LNG, PublicStatus.Active),
    );
    await repo.save(
      makeVisible('Saturated', ORIGIN_LAT, ORIGIN_LNG, PublicStatus.Saturated),
    );
    await repo.save(
      makeVisible('Paused', ORIGIN_LAT, ORIGIN_LNG, PublicStatus.Paused),
    );

    const result = await useCase.execute({
      emergencyId: EM,
      lat: ORIGIN_LAT,
      lng: ORIGIN_LNG,
      radiusMeters: 5000,
      limit: 10,
    });

    expect(result.items).toHaveLength(3);
  });
});
