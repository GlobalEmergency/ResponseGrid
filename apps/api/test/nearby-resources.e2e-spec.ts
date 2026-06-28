import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import { DrizzleResourceRepository } from '../src/contexts/resources/infrastructure/drizzle/drizzle-resource.repository';
import { Resource } from '../src/contexts/resources/domain/resource';
import { ResourceId } from '../src/contexts/resources/domain/resource-id';
import { EmergencyId } from '../src/shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../src/contexts/resources/domain/resource-enums';
import { Location } from '../src/shared/domain/location';

// ── Response shape types ──────────────────────────────────────────────────────

interface NearbyResourceViewBody {
  id: string;
  name: string;
  type: string;
  stage: string;
  verificationLevel: string;
  publicStatus: string;
  location: { address: string; latitude: number; longitude: number };
  accepts: string[];
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  country: string | null;
  city: string | null;
  sourceName: string | null;
  externalUpdatedAt: string | null;
  ownerOrganizationId: string | null;
  distanceMeters: number;
}

interface NearbyResourcesBody {
  items: NearbyResourceViewBody[];
}

// IDs that don't conflict with other e2e specs
const EM = 'bbbbbbbb-1111-4111-8111-000000000028';
const OWNER_ID = 'f2000000-0000-4000-8000-000000000028';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

// Caracas origin point
const ORIGIN_LAT = 10.4806;
const ORIGIN_LNG = -66.9036;

const makeVisible = (name: string, lat: number, lng: number) =>
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
    publicStatus: PublicStatus.Active,
    createdAt: new Date(),
  });

describe('Nearby resources (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;

    // Ensure the emergency exists
    const { db, pool } = createDb(DB_URL);
    try {
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Nearby Resources Emergency',
          slug: 'nearby-resources-emergency',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper: clean the emergency's resources then seed
  async function withCleanRepo(
    fn: (repo: DrizzleResourceRepository) => Promise<void>,
  ) {
    const { db, pool } = createDb(DB_URL);
    try {
      await db.delete(resourcesTable).where(eq(resourcesTable.emergencyId, EM));
      const repo = new DrizzleResourceRepository(db);
      await fn(repo);
    } finally {
      await pool.end();
    }
  }

  it('GET .../nearby returns 200 with items array, all with distanceMeters, ordered ascending', async () => {
    await withCleanRepo(async (repo) => {
      // At origin (~0m)
      await repo.save(makeVisible('R1 origin', ORIGIN_LAT, ORIGIN_LNG));
      // ~1.3km away
      await repo.save(makeVisible('R2 nearby', 10.49, -66.903));
      // ~13km away
      await repo.save(makeVisible('R3 far', 10.6, -66.9));
    });

    const res = await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lat=${ORIGIN_LAT}&lng=${ORIGIN_LNG}&radius=20000`,
      )
      .expect(200);

    const body = res.body as NearbyResourcesBody;
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);

    // All items must have distanceMeters as a number
    for (const item of body.items) {
      expect(typeof item.distanceMeters).toBe('number');
      expect(item.distanceMeters).toBeGreaterThanOrEqual(0);
    }

    // Items must be ordered ascending by distance
    for (let i = 1; i < body.items.length; i++) {
      expect(body.items[i].distanceMeters).toBeGreaterThanOrEqual(
        body.items[i - 1].distanceMeters,
      );
    }
  });

  it('invalid lat (> 90) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lat=91&lng=${ORIGIN_LNG}&radius=5000`,
      )
      .expect(400);
  });

  it('invalid lng (< -180) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lat=${ORIGIN_LAT}&lng=-181&radius=5000`,
      )
      .expect(400);
  });

  it('radius > 100000 returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lat=${ORIGIN_LAT}&lng=${ORIGIN_LNG}&radius=100001`,
      )
      .expect(400);
  });

  it('missing required param (no lat) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lng=${ORIGIN_LNG}&radius=5000`,
      )
      .expect(400);
  });

  it('limit=200 returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/nearby?lat=${ORIGIN_LAT}&lng=${ORIGIN_LNG}&radius=5000&limit=200`,
      )
      .expect(400);
  });
});
