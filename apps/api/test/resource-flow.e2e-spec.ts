import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
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

interface PagedResourcesBody {
  items: Array<{
    id: string;
    stage: string;
    publicStatus: string;
    location: { address: string };
  }>;
  total: number;
  page: number;
  limit: number;
}

const EM = '11111111-1111-4111-8111-111111111111';
// Use unique IDs separate from auth-flow.e2e-spec.ts to avoid PK conflicts
const COORD_ID = 'dd000000-0000-4000-8000-000000000004';
const MEMBERSHIP_ID = 'ee000000-0000-4000-8000-000000000005';

const baseLocation = {
  address: 'Plaza España, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

describe('Resource flow (e2e)', () => {
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
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(resourcesTable);
      await db.delete(membershipsTable);
      await db.delete(usersTable);

      // Ensure the emergency exists so the intake kill-switch allows creation
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

      const coordHash = await bcrypt.hash('coord1234', 10);
      await db.insert(usersTable).values({
        id: COORD_ID,
        email: 'coord@reliefhub.org',
        passwordHash: coordHash,
        name: 'Coordinator',
        isAdmin: false,
      });
      await db.insert(membershipsTable).values({
        id: MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM,
        role: 'coordinator',
      });
    } finally {
      await pool.end();
    }

    // Obtain coordinator token
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'coord@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /emergencies/:id/resources without token returns 401', async () => {
    await request(server)
      .post(`/emergencies/${EM}/resources`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name: 'Almacén Sin Auth',
        location: baseLocation,
      })
      .expect(401);
  });

  it('registers with token → appears in queue → verifies → publishes → appears in public', async () => {
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'warehouse',
        stage: 'intermediate',
        name: 'Almacén E2E',
        location: baseLocation,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;
    expect(typeof id).toBe('string');

    const queue = await request(server)
      .get(`/emergencies/${EM}/coordination/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect(queue.body).toEqual([
      expect.objectContaining({
        id,
        stage: 'intermediate',
        verificationLevel: 'unverified',
        publicStatus: 'hidden',
        location: expect.objectContaining({
          address: baseLocation.address,
        }) as unknown,
      }),
    ]);

    await request(server)
      .post(`/resources/${id}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);
    await request(server)
      .post(`/resources/${id}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    const afterPublish = await request(server)
      .get(`/emergencies/${EM}/coordination/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect(afterPublish.body).toEqual([]); // no longer pending

    const publicResources = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const pubBody = publicResources.body as PagedResourcesBody;
    expect(pubBody.items).toHaveLength(1);
    expect(pubBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id,
          stage: 'intermediate',
          publicStatus: 'active',
          location: expect.objectContaining({
            address: baseLocation.address,
          }) as unknown,
        }),
      ]),
    );
    expect(pubBody.total).toBe(1);
    expect(pubBody.page).toBe(1);
  });

  it('registers with collection_and_delivery type → 201', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'collection_and_delivery',
        stage: 'destination',
        name: 'Punto Mixto E2E',
        location: baseLocation,
      })
      .expect(201);
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  it('verify on non-existent resource returns 404', async () => {
    const nonExistentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await request(server)
      .post(`/resources/${nonExistentId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(404);
  });

  it('publish without prior verification returns 409', async () => {
    // Register a resource but do NOT verify it
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'venue',
        stage: 'destination',
        name: 'Venue unverified',
        location: baseLocation,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;

    // Attempt to publish without verifying → 409
    await request(server)
      .post(`/resources/${id}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(409);
  });
});
