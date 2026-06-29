import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';

const EM = '11111111-1111-4111-8111-111111111111';

// UUIDs distinct from the other resource e2e files.
const ADMIN_ID = 'ad177000-0000-4000-8000-000000000001';
const OWNER_ID = 'ad177000-0000-4000-8000-000000000002';
const COORD_ID = 'ad177000-0000-4000-8000-000000000003';
const COORD_MEMBERSHIP_ID = 'ad177000-0000-4000-8000-000000000004';

const baseLocation = {
  address: 'Av. del Puerto 22, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

/**
 * Admin centers/resources console (#177). The list and detail expose ALL
 * resources of every status + verification level → strictly `resource:read` at
 * the platform scope, which only `platform_admin` (isAdmin) holds. Crucially an
 * emergency COORDINATOR (who holds `resource:read` at the emergency scope) is
 * still 403 on these param-less / `:id` routes — proving the platform scoping.
 */
describe('Admin resources console (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let citizenToken: string;
  let coordToken: string;
  let hiddenResourceId: string;

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

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db
        .delete(membershipsTable)
        .where(
          inArray(membershipsTable.userId, [ADMIN_ID, OWNER_ID, COORD_ID]),
        );
      await db
        .delete(usersTable)
        .where(inArray(usersTable.id, [ADMIN_ID, OWNER_ID, COORD_ID]));

      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Terremoto Venezuela 2026',
          slug: 'terremoto-venezuela-2026',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const [adminHash, ownerHash, coordHash] = await Promise.all([
        bcrypt.hash('admin1234', 10),
        bcrypt.hash('owner1234', 10),
        bcrypt.hash('coord1234', 10),
      ]);

      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'admin-res177@reliefhub.org',
            passwordHash: adminHash,
            name: 'Res Admin',
            isAdmin: true,
          },
          {
            id: OWNER_ID,
            email: 'owner-res177@reliefhub.org',
            passwordHash: ownerHash,
            name: 'Res Owner',
            isAdmin: false,
          },
          {
            id: COORD_ID,
            email: 'coord-res177@reliefhub.org',
            passwordHash: coordHash,
            name: 'Res Coord',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(membershipsTable)
        .values({
          id: COORD_MEMBERSHIP_ID,
          userId: COORD_ID,
          emergencyId: EM,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const [adminRes, citizenRes, coordRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'admin-res177@reliefhub.org', password: 'admin1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'owner-res177@reliefhub.org', password: 'owner1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-res177@reliefhub.org', password: 'coord1234' })
        .expect(200),
    ]);
    adminToken = (adminRes.body as { accessToken: string }).accessToken;
    citizenToken = (citizenRes.body as { accessToken: string }).accessToken;
    coordToken = (coordRes.body as { accessToken: string }).accessToken;

    // A freshly registered resource is HIDDEN + UNVERIFIED → invisible to the
    // public read, but the admin console must still surface it.
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name: 'Centro oculto e2e 177',
        location: baseLocation,
      })
      .expect(201);
    hiddenResourceId = (created.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /resources (admin list)', () => {
    it('returns 401 without a token', async () => {
      await request(server).get('/resources').expect(401);
    });

    it('returns 403 for a plain citizen', async () => {
      await request(server)
        .get('/resources')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('returns 403 for an emergency coordinator (not platform-scoped)', async () => {
      await request(server)
        .get('/resources')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('lists the hidden/unverified resource for an admin, with emergency name', async () => {
      const res = await request(server)
        .get('/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as {
        items: Array<{
          id: string;
          publicStatus: string;
          verificationLevel: string;
          emergencyId: string;
          emergencyName: string | null;
        }>;
        total: number;
      };
      expect(Array.isArray(body.items)).toBe(true);
      const row = body.items.find((r) => r.id === hiddenResourceId);
      expect(row).toBeDefined();
      expect(row?.publicStatus).toBe('hidden');
      expect(row?.verificationLevel).toBe('unverified');
      expect(row?.emergencyId).toBe(EM);
      expect(row?.emergencyName).toBe('Terremoto Venezuela 2026');
    });

    it('filters by status=hidden', async () => {
      const res = await request(server)
        .get('/resources?status=hidden')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body as { items: Array<{ publicStatus: string }> };
      expect(body.items.every((r) => r.publicStatus === 'hidden')).toBe(true);
    });

    it('rejects an invalid status with 400', async () => {
      await request(server)
        .get('/resources?status=banana')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /resources/:id (admin detail)', () => {
    it('returns 401 without a token', async () => {
      await request(server).get(`/resources/${hiddenResourceId}`).expect(401);
    });

    it('returns 403 for a plain citizen', async () => {
      await request(server)
        .get(`/resources/${hiddenResourceId}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('returns 403 for an emergency coordinator', async () => {
      await request(server)
        .get(`/resources/${hiddenResourceId}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('returns the hidden resource detail for an admin', async () => {
      const res = await request(server)
        .get(`/resources/${hiddenResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as {
        id: string;
        publicStatus: string;
        emergencyName: string | null;
        inventoryCategories: string[];
        validityReports: unknown[];
      };
      expect(body.id).toBe(hiddenResourceId);
      expect(body.publicStatus).toBe('hidden');
      expect(body.emergencyName).toBe('Terremoto Venezuela 2026');
      expect(Array.isArray(body.inventoryCategories)).toBe(true);
      expect(Array.isArray(body.validityReports)).toBe(true);
    });

    it('returns 404 for an unknown resource id', async () => {
      await request(server)
        .get('/resources/00000000-0000-4000-8000-0000000000ff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 400 for a non-UUID id', async () => {
      await request(server)
        .get('/resources/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
