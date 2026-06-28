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

// IDs that don't conflict with other e2e specs
const EM = 'cccccccc-6800-4111-8111-000000000068';
const OWNER_ID = 'f3000000-0000-4000-8000-000000000068';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

// Bounding box around Caracas, Venezuela
const MIN_LAT = 10.3;
const MAX_LAT = 10.7;
const MIN_LNG = -67.2;
const MAX_LNG = -66.6;

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

describe('In-bounds resources (e2e)', () => {
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
          name: 'In-Bounds Resources Emergency',
          slug: 'in-bounds-resources-emergency',
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

  const boundsQuery = `minLat=${MIN_LAT}&minLng=${MIN_LNG}&maxLat=${MAX_LAT}&maxLng=${MAX_LNG}`;

  it('GET .../in-bounds returns 200 with items array containing only in-bounds resources', async () => {
    await withCleanRepo(async (repo) => {
      // Inside bounding box
      await repo.save(makeVisible('R1 inside', 10.48, -66.9));
      await repo.save(makeVisible('R2 inside', 10.55, -67.1));
      // Outside bounding box (too far north)
      await repo.save(makeVisible('R3 outside', 10.8, -66.9));
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources/in-bounds?${boundsQuery}`)
      .expect(200);

    const body = res.body as { items: { name: string }[] };
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    const names = body.items.map((i) => i.name).sort();
    expect(names).toContain('R1 inside');
    expect(names).toContain('R2 inside');
    expect(names).not.toContain('R3 outside');
  });

  it('hidden resources are excluded', async () => {
    await withCleanRepo(async (repo) => {
      const hidden = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(EM),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Hidden R',
        location: Location.create({
          address: 'addr',
          latitude: 10.48,
          longitude: -66.9,
        }),
        ownerUserId: OWNER_ID,
      });
      await repo.save(hidden);
      await repo.save(makeVisible('Visible R', 10.48, -66.9));
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources/in-bounds?${boundsQuery}`)
      .expect(200);

    const body = res.body as { items: { name: string }[] };
    expect(body.items.map((i) => i.name)).not.toContain('Hidden R');
    expect(body.items.map((i) => i.name)).toContain('Visible R');
  });

  it('invalid minLat (< -90) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/in-bounds?minLat=-91&minLng=${MIN_LNG}&maxLat=${MAX_LAT}&maxLng=${MAX_LNG}`,
      )
      .expect(400);
  });

  it('invalid maxLng (> 180) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/in-bounds?minLat=${MIN_LAT}&minLng=${MIN_LNG}&maxLat=${MAX_LAT}&maxLng=181`,
      )
      .expect(400);
  });

  it('missing required param (no maxLat) returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/in-bounds?minLat=${MIN_LAT}&minLng=${MIN_LNG}&maxLng=${MAX_LNG}`,
      )
      .expect(400);
  });

  it('limit=1001 returns 400', async () => {
    await request(server)
      .get(
        `/emergencies/${EM}/public/resources/in-bounds?${boundsQuery}&limit=1001`,
      )
      .expect(400);
  });

  it('returns empty items when no resources exist in box', async () => {
    await withCleanRepo(async () => {
      // Nothing seeded
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources/in-bounds?${boundsQuery}`)
      .expect(200);

    const body = res.body as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });
});
