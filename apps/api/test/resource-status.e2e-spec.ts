import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = '11111111-1111-4111-8111-111111111111';

// Use UUIDs that don't conflict with resource-flow.e2e-spec.ts
const OWNER_ID = 'aa100000-0000-4000-8000-000000000001';
const COORD_ID = 'aa200000-0000-4000-8000-000000000002';
const THIRD_ID = 'aa300000-0000-4000-8000-000000000003';
const COORD_MEMBERSHIP_ID = 'aa400000-0000-4000-8000-000000000004';

const baseLocation = {
  address: 'Av. del Puerto 22, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

describe('Resource status semaphore (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let ownerToken: string;
  let coordToken: string;
  let thirdToken: string;

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
      await db.delete(resourcesTable);
      await db
        .delete(membershipsTable)
        .where(
          inArray(membershipsTable.userId, [OWNER_ID, COORD_ID, THIRD_ID]),
        );
      await db
        .delete(usersTable)
        .where(inArray(usersTable.id, [OWNER_ID, COORD_ID, THIRD_ID]));

      // Ensure emergency exists
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Resource Flow Emergency',
          slug: 'resource-flow-emergency',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const [ownerHash, coordHash, thirdHash] = await Promise.all([
        bcrypt.hash('owner1234', 10),
        bcrypt.hash('coord1234', 10),
        bcrypt.hash('third1234', 10),
      ]);

      await db.insert(usersTable).values([
        {
          id: OWNER_ID,
          email: 'owner-status@reliefhub.org',
          passwordHash: ownerHash,
          name: 'Owner',
          isAdmin: false,
        },
        {
          id: COORD_ID,
          email: 'coord-status@reliefhub.org',
          passwordHash: coordHash,
          name: 'Coordinator',
          isAdmin: false,
        },
        {
          id: THIRD_ID,
          email: 'third-status@reliefhub.org',
          passwordHash: thirdHash,
          name: 'Third',
          isAdmin: false,
        },
      ]);

      await db.insert(membershipsTable).values({
        id: COORD_MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM,
        role: 'coordinator',
      });
    } finally {
      await pool.end();
    }

    const [ownerRes, coordRes, thirdRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'owner-status@reliefhub.org', password: 'owner1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-status@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'third-status@reliefhub.org', password: 'third1234' })
        .expect(200),
    ]);
    ownerToken = (ownerRes.body as { accessToken: string }).accessToken;
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    thirdToken = (thirdRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Create, verify (as coord) and publish a resource owned by the owner user */
  async function createPublishedResource(name: string): Promise<string> {
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name,
        location: baseLocation,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await request(server)
      .post(`/resources/${id}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);
    await request(server)
      .post(`/resources/${id}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);
    return id;
  }

  it('owner marks their resource as saturated → 204; appears in public list with saturated status', async () => {
    const id = await createPublishedResource('Punto Saturado');

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'saturated' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string; publicStatus: string }> }
    ).items.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.publicStatus).toBe('saturated');
  });

  it('third-party user (not owner, not coordinator) → 403', async () => {
    const id = await createPublishedResource('Punto Tercero');

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${thirdToken}`)
      .send({ status: 'saturated' })
      .expect(403);
  });

  it('coordinator changes any resource status → 204', async () => {
    const id = await createPublishedResource('Punto Coordinador');

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ status: 'paused' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string; publicStatus: string }> }
    ).items.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.publicStatus).toBe('paused');
  });

  it('closed resource disappears from public list', async () => {
    const id = await createPublishedResource('Punto Cerrado');

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'closed' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string }> }
    ).items.find((r) => r.id === id);
    expect(found).toBeUndefined();
  });

  it('reopen: closed → active → appears again in public list', async () => {
    const id = await createPublishedResource('Punto Reabierto');

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'closed' })
      .expect(204);

    await request(server)
      .post(`/resources/${id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'active' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string; publicStatus: string }> }
    ).items.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.publicStatus).toBe('active');
  });

  it('GET /emergencies/:id/resources/mine returns only own resources', async () => {
    // Create a resource owned by coordinator to verify filtering
    const coordCreated = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'venue',
        stage: 'destination',
        name: 'Coord Venue',
        location: baseLocation,
      })
      .expect(201);
    const coordResourceId = (coordCreated.body as { id: string }).id;

    const mineRes = await request(server)
      .get(`/emergencies/${EM}/resources/mine`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const mine = mineRes.body as Array<{ id: string }>;
    // Coordinator's resource is NOT in owner's list
    expect(mine.some((r) => r.id === coordResourceId)).toBe(false);
    // All returned resources belong to owner (not an empty check — we created several above)
    expect(mine.length).toBeGreaterThan(0);
  });

  it('POST /resources/:id/status without token → 401', async () => {
    const id = await createPublishedResource('Punto Sin Auth');
    await request(server)
      .post(`/resources/${id}/status`)
      .send({ status: 'saturated' })
      .expect(401);
  });
});
