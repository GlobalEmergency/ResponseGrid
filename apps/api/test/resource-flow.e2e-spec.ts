import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import { usersTable, membershipsTable } from '../src/contexts/identity/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = '11111111-1111-4111-8111-111111111111';
// Use unique IDs separate from auth-flow.e2e-spec.ts to avoid PK conflicts
const COORD_ID = 'dd000000-0000-4000-8000-000000000004';
const MEMBERSHIP_ID = 'ee000000-0000-4000-8000-000000000005';

describe('Resource flow (e2e)', () => {
  let app: INestApplication;
  let coordToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    const { db, pool } = createDb(process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub');
    try {
      await db.delete(resourcesTable);
      await db.delete(membershipsTable);
      await db.delete(usersTable);

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
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'coord@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => { await app.close(); });

  it('registers → appears in queue → verifies → publishes', async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .send({ type: 'warehouse', side: 'origin', name: 'Almacén E2E' })
      .expect(201);
    const id = created.body.id;

    const queue = await request(server)
      .get(`/emergencies/${EM}/coordination/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect(queue.body).toEqual([expect.objectContaining({ id, verificationLevel: 'unverified', publicStatus: 'hidden' })]);

    await request(server)
      .post(`/resources/${id}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ level: 'verified' })
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

    const publicResources = await request(server).get(`/emergencies/${EM}/public/resources`).expect(200);
    expect(publicResources.body).toEqual([expect.objectContaining({ id, publicStatus: 'active' })]);
  });

  it('verify on non-existent resource returns 404', async () => {
    const server = app.getHttpServer();
    const nonExistentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await request(server)
      .post(`/resources/${nonExistentId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ level: 'verified' })
      .expect(404);
  });

  it('publish without prior verification returns 409', async () => {
    const server = app.getHttpServer();

    // Register a resource but do NOT verify it
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .send({ type: 'venue', side: 'destination', name: 'Venue unverified' })
      .expect(201);
    const id = created.body.id;

    // Attempt to publish without verifying → 409
    await request(server)
      .post(`/resources/${id}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(409);
  });
});
