/**
 * E2E: coordinator authorization scoping (Bug B fix).
 *
 * Verifies that a coordinator of emergency A cannot act on resources/needs
 * that belong to a different emergency B, and gets 403; while they CAN act
 * on resources/needs of their own emergency (204). Missing resource/need → 404.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import {
  needsTable,
  needItemsTable,
} from '../src/contexts/needs/infrastructure/drizzle/schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// Emergency A: the coordinator belongs to this one
const EM_A = '11111111-1111-4111-8111-111111111111';
// Emergency B: a different emergency the coordinator does NOT belong to
const EM_B = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

// Unique IDs for this spec file
const COORD_SCOPE_ID = 'c0000000-0000-4000-8000-000000000c01';
const OWNER_B_ID = 'c0000000-0000-4000-8000-000000000c02';
const MEMBERSHIP_SCOPE_ID = 'c0000000-0000-4000-8000-000000000c03';

const baseLocation = {
  address: 'Calle Test, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

describe('Coordinator scope authz (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;

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
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new NeedsDomainExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean up data from previous runs (FK-safe order)
      await db.delete(needItemsTable);
      await db.delete(needsTable);
      await db.delete(resourcesTable);

      // Ensure both emergencies exist (kill-switch reads status)
      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM_A,
            name: 'Scope Emergency A',
            slug: 'scope-emergency-a',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: EM_B,
            name: 'Scope Emergency B',
            slug: 'scope-emergency-b',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Insert coordinator user and membership on EM_A only
      await db
        .insert(usersTable)
        .values({
          id: COORD_SCOPE_ID,
          email: 'coord-scope@reliefhub.org',
          passwordHash: await bcrypt.hash('coord1234', 10),
          name: 'Scope Coordinator',
          isAdmin: false,
        })
        .onConflictDoNothing();
      await db
        .insert(usersTable)
        .values({
          id: OWNER_B_ID,
          email: 'owner-b@reliefhub.org',
          passwordHash: await bcrypt.hash('owner1234', 10),
          name: 'Owner B',
          isAdmin: false,
        })
        .onConflictDoNothing();
      // Coordinator is member of EM_A only
      await db
        .insert(membershipsTable)
        .values({
          id: MEMBERSHIP_SCOPE_ID,
          userId: COORD_SCOPE_ID,
          emergencyId: EM_A,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'coord-scope@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Resources ───────────────────────────────────────────────────────────────

  describe('POST /resources/:id/verify', () => {
    it('coordinator CAN verify a resource of their own emergency → 204', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM_A}/resources`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          type: 'warehouse',
          name: 'My Resource',
          location: baseLocation,
        })
        .expect(201);
      const resourceId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(204);
    });

    it('coordinator CANNOT verify a resource of a different emergency → 403', async () => {
      // Create resource in EM_B using OWNER_B token (logged in as admin for simplicity: use coordinator
      // endpoint that only needs JwtAuthGuard)
      const ownerLoginRes = await request(server)
        .post('/auth/login')
        .send({ email: 'owner-b@reliefhub.org', password: 'owner1234' })
        .expect(200);
      const ownerToken: string = (ownerLoginRes.body as { accessToken: string })
        .accessToken;

      const created = await request(server)
        .post(`/emergencies/${EM_B}/resources`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          type: 'warehouse',
          name: 'Other EM Resource',
          location: baseLocation,
        })
        .expect(201);
      const resourceId: string = (created.body as { id: string }).id;

      // Coordinator of EM_A tries to verify resource of EM_B → 403
      await request(server)
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(403);
    });

    it('non-existent resource → 404', async () => {
      await request(server)
        .post('/resources/00000000-0000-4000-8000-000000000099/verify')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(404);
    });
  });

  describe('POST /resources/:id/publish', () => {
    it('coordinator CAN publish a verified resource of their own emergency → 204', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM_A}/resources`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          type: 'venue',
          name: 'Publishable Resource',
          location: baseLocation,
        })
        .expect(201);
      const resourceId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(204);

      await request(server)
        .post(`/resources/${resourceId}/publish`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);
    });

    it('coordinator CANNOT publish a resource of a different emergency → 403', async () => {
      const ownerLoginRes = await request(server)
        .post('/auth/login')
        .send({ email: 'owner-b@reliefhub.org', password: 'owner1234' })
        .expect(200);
      const ownerToken: string = (ownerLoginRes.body as { accessToken: string })
        .accessToken;

      const created = await request(server)
        .post(`/emergencies/${EM_B}/resources`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          type: 'warehouse',
          name: 'Other EM Resource 2',
          location: baseLocation,
        })
        .expect(201);
      const resourceId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/resources/${resourceId}/publish`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('non-existent resource → 404', async () => {
      await request(server)
        .post('/resources/00000000-0000-4000-8000-000000000098/publish')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(404);
    });
  });

  // ── Needs ────────────────────────────────────────────────────────────────────

  const baseNeedBody = {
    title: 'Scope test need',
    location: baseLocation,
    priority: 'high',
    items: [{ name: 'Water', quantity: 10, unit: 'liters', category: 'water' }],
  };

  describe('POST /needs/:id/validate', () => {
    it('coordinator CAN validate a need of their own emergency → 204', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM_A}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send(baseNeedBody)
        .expect(201);
      const needId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/needs/${needId}/validate`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);
    });

    it('coordinator CANNOT validate a need of a different emergency → 403', async () => {
      const ownerLoginRes = await request(server)
        .post('/auth/login')
        .send({ email: 'owner-b@reliefhub.org', password: 'owner1234' })
        .expect(200);
      const ownerToken: string = (ownerLoginRes.body as { accessToken: string })
        .accessToken;

      const created = await request(server)
        .post(`/emergencies/${EM_B}/needs`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(baseNeedBody)
        .expect(201);
      const needId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/needs/${needId}/validate`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });

    it('non-existent need → 404', async () => {
      await request(server)
        .post('/needs/00000000-0000-4000-8000-000000000097/validate')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(404);
    });
  });

  describe('POST /needs/:id/assign-manager', () => {
    const ORG_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

    it('coordinator CAN assign manager to a need of their own emergency → 204', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM_A}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ ...baseNeedBody, title: 'Assign manager test' })
        .expect(201);
      const needId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/needs/${needId}/assign-manager`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ organizationId: ORG_ID })
        .expect(204);
    });

    it('coordinator CANNOT assign manager to a need of a different emergency → 403', async () => {
      const ownerLoginRes = await request(server)
        .post('/auth/login')
        .send({ email: 'owner-b@reliefhub.org', password: 'owner1234' })
        .expect(200);
      const ownerToken: string = (ownerLoginRes.body as { accessToken: string })
        .accessToken;

      const created = await request(server)
        .post(`/emergencies/${EM_B}/needs`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...baseNeedBody, title: 'Other EM need' })
        .expect(201);
      const needId: string = (created.body as { id: string }).id;

      await request(server)
        .post(`/needs/${needId}/assign-manager`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ organizationId: ORG_ID })
        .expect(403);
    });

    it('non-existent need → 404', async () => {
      await request(server)
        .post('/needs/00000000-0000-4000-8000-000000000096/assign-manager')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ organizationId: ORG_ID })
        .expect(404);
    });
  });
});
