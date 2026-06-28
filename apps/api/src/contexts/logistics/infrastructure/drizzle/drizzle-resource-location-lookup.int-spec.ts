import { createDb, Db } from '../../../../shared/db';
import { resourcesTable } from '../../../resources/infrastructure/drizzle/schema';
import { DrizzleResourceRepository } from '../../../resources/infrastructure/drizzle/drizzle-resource.repository';
import { Resource } from '../../../resources/domain/resource';
import { ResourceId } from '../../../resources/domain/resource-id';
import {
  ResourceStage,
  ResourceType,
} from '../../../resources/domain/resource-enums';
import { Location } from '../../../../shared/domain/location';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { DrizzleResourceLocationLookup } from './drizzle-resource-location-lookup';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

describe('DrizzleResourceLocationLookup (integration)', () => {
  let db: Db;
  let pool: Pool;
  let resources: DrizzleResourceRepository;
  let lookup: DrizzleResourceLocationLookup;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    resources = new DrizzleResourceRepository(db);
    lookup = new DrizzleResourceLocationLookup(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(resourcesTable);
  });

  it('resolves the lat/lng of an existing resource', async () => {
    const resource = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Punto de acopio centro',
      location: Location.create({
        address: 'Av. Bolívar 1, Caracas',
        latitude: 10.4806,
        longitude: -66.9036,
      }),
      ownerUserId: OWNER_ID,
    });
    await resources.save(resource);

    const latLng = await lookup.findLatLng(resource.id.value);
    expect(latLng).not.toBeNull();
    expect(latLng!.latitude).toBeCloseTo(10.4806, 4);
    expect(latLng!.longitude).toBeCloseTo(-66.9036, 4);
  });

  it('returns null for an unknown resource id', async () => {
    const latLng = await lookup.findLatLng(
      '99999999-9999-4999-8999-999999999999',
    );
    expect(latLng).toBeNull();
  });
});
