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

// ── Response shape types (mirrors response.dto.ts) ───────────────────────────

interface ResourceViewBody {
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
}

interface PagedResourcesBody {
  items: ResourceViewBody[];
  total: number;
  page: number;
  limit: number;
}

interface ResourceFacetsBody {
  byCategory: Record<string, number>;
  byCountry: Record<string, number>;
  total: number;
}

// IDs that don't conflict with other e2e specs
const EM = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OWNER_ID = 'f1000000-0000-4000-8000-000000000091';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const baseLocation = Location.create({
  address: 'Calle Test E2E, Caracas',
  latitude: 10.4806,
  longitude: -66.9036,
});

const makeVisible = (
  name: string,
  opts: { accepts?: string[]; country?: string | null } = {},
) =>
  Resource.fromSnapshot({
    ...Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name,
      location: baseLocation,
      ownerUserId: OWNER_ID,
      accepts: opts.accepts ?? [],
      country: opts.country ?? null,
    }).toSnapshot(),
    verificationLevel: VerificationLevel.Verified,
    publicStatus: PublicStatus.Active,
    createdAt: new Date(),
  });

describe('Public resources paged (e2e)', () => {
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
          name: 'Paged Resources Emergency',
          slug: 'paged-resources-emergency',
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

  it('GET /emergencies/:id/public/resources returns { items, total, page, limit }', async () => {
    await withCleanRepo(async (repo) => {
      await repo.save(makeVisible('R1', { accepts: ['water'], country: 'VE' }));
      await repo.save(makeVisible('R2', { accepts: ['food'], country: 'CO' }));
      await repo.save(
        makeVisible('R3', { accepts: ['water', 'food'], country: 'VE' }),
      );
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);

    const body = res.body as PagedResourcesBody;
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total', 3);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 50);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(3);
  });

  it('pagination with limit=2 returns 2 items and correct total', async () => {
    await withCleanRepo(async (repo) => {
      await repo.save(makeVisible('P1'));
      await repo.save(makeVisible('P2'));
      await repo.save(makeVisible('P3'));
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources?page=1&limit=2`)
      .expect(200);

    const body = res.body as PagedResourcesBody;
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
  });

  it('?category=water filters resources by category', async () => {
    await withCleanRepo(async (repo) => {
      await repo.save(
        makeVisible('Water One', { accepts: ['water'], country: 'VE' }),
      );
      await repo.save(
        makeVisible('Food Only', { accepts: ['food'], country: 'CO' }),
      );
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources?category=water`)
      .expect(200);

    const body = res.body as PagedResourcesBody;
    expect(body.total).toBe(1);
    expect(body.items[0].name).toBe('Water One');
    expect(body.items[0].accepts).toContain('water');
  });

  it('?country=VE filters resources by country', async () => {
    await withCleanRepo(async (repo) => {
      await repo.save(makeVisible('VE Resource', { country: 'VE' }));
      await repo.save(makeVisible('CO Resource', { country: 'CO' }));
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources?country=VE`)
      .expect(200);

    const body = res.body as PagedResourcesBody;
    expect(body.total).toBe(1);
    expect(body.items[0].name).toBe('VE Resource');
    expect(body.items[0].country).toBe('VE');
  });

  it('GET /emergencies/:id/public/resources/facets returns facets', async () => {
    await withCleanRepo(async (repo) => {
      await repo.save(
        makeVisible('F1', { accepts: ['water', 'food'], country: 'VE' }),
      );
      await repo.save(makeVisible('F2', { accepts: ['water'], country: 'CO' }));
      // Hidden resource should not appear in facets
      const hidden = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(EM),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Hidden',
        location: baseLocation,
        ownerUserId: OWNER_ID,
        accepts: ['water'],
        country: 'VE',
      });
      await repo.save(hidden);
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources/facets`)
      .expect(200);

    const body = res.body as ResourceFacetsBody;
    expect(body.total).toBe(2);
    expect(body.byCategory.water).toBe(2);
    expect(body.byCategory.food).toBe(1);
    expect(body.byCountry.VE).toBe(1);
    expect(body.byCountry.CO).toBe(1);
  });

  it('ResourceViewDto includes enriched fields (accepts, contact, country, etc.)', async () => {
    await withCleanRepo(async (repo) => {
      const r = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Rich Resource',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: ['water'],
          contact: '+1-555-0100',
          schedule: 'Mon-Fri 9-17',
          manager: 'María',
          country: 'VE',
          city: 'Maracaibo',
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      await repo.save(r);
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);

    const item = (res.body as PagedResourcesBody).items[0];
    expect(item.accepts).toEqual(['water']);
    expect(item.contact).toBe('+1-555-0100');
    expect(item.schedule).toBe('Mon-Fri 9-17');
    expect(item.manager).toBe('María');
    expect(item.country).toBe('VE');
    expect(item.city).toBe('Maracaibo');
  });

  it('GET /emergencies/:id/public/resources?limit=200 returns 400 (exceeds @Max(100))', async () => {
    await request(server)
      .get(`/emergencies/${EM}/public/resources?limit=200`)
      .expect(400);
  });

  it('ResourceViewDto returns provenance fields when resource has sourceName + externalUpdatedAt', async () => {
    const provenanceDate = new Date('2026-06-25T12:00:00.000Z');
    await withCleanRepo(async (repo) => {
      const r = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Provenance Resource',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: [],
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
        provenance: {
          sourceName: 'acopiove.org',
          externalId: 'ext-001',
          externalUpdatedAt: provenanceDate,
          raw: null,
        },
      });
      await repo.save(r);
    });

    const res = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);

    const item = (res.body as PagedResourcesBody).items[0];
    expect(typeof item.sourceName).toBe('string');
    expect(item.sourceName).toBe('acopiove.org');
    expect(typeof item.externalUpdatedAt).toBe('string');
    expect(item.externalUpdatedAt).toBe(provenanceDate.toISOString());
  });
});
