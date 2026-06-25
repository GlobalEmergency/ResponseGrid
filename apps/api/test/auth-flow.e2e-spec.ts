import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { usersTable, membershipsTable } from '../src/contexts/identity/infrastructure/drizzle/schema';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// Use unique IDs for this test file to avoid collisions with resource-flow.e2e-spec.ts
const EM_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = 'aa000000-0000-4000-8000-000000000001';
const COORD_ID = 'bb000000-0000-4000-8000-000000000002';
const MEMBERSHIP_ID = 'cc000000-0000-4000-8000-000000000003';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let coordToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    // Seed test data — clean slate then insert idempotently
    const { db, pool } = createDb(
      process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean in FK-safe order
      await db.delete(resourcesTable);
      await db.delete(membershipsTable);
      await db.delete(usersTable);
      await db.delete(emergenciesTable);

      const adminHash = await bcrypt.hash('admin1234', 10);
      const coordHash = await bcrypt.hash('coord1234', 10);

      await db.insert(usersTable).values([
        { id: ADMIN_ID, email: 'admin@reliefhub.org', passwordHash: adminHash, name: 'Admin', isAdmin: true },
        { id: COORD_ID, email: 'coord@reliefhub.org', passwordHash: coordHash, name: 'Coordinator', isAdmin: false },
      ]);

      await db.insert(emergenciesTable).values({
        id: EM_ID,
        name: 'Emergencia sísmica — Venezuela',
        slug: 'venezuela',
        country: 'VE',
        status: 'active',
        createdAt: new Date(),
      });

      await db.insert(membershipsTable).values({
        id: MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM_ID,
        role: 'coordinator',
      });
    } finally {
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns 200 and accessToken for admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@reliefhub.org', password: 'admin1234' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      adminToken = res.body.accessToken as string;
    });

    it('returns 200 and accessToken for coordinator credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'coord@reliefhub.org', password: 'coord1234' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      coordToken = res.body.accessToken as string;
    });

    it('returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@reliefhub.org', password: 'wrongpassword' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'pass1234' })
        .expect(401);
    });
  });

  describe('POST /emergencies (admin only)', () => {
    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/emergencies')
        .send({ name: 'Test Emergency', country: 'CO' })
        .expect(401);
    });

    it('returns 403 with coordinator token (not admin)', async () => {
      await request(app.getHttpServer())
        .post('/emergencies')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ name: 'Test Emergency', country: 'CO' })
        .expect(403);
    });

    it('returns 201 with admin token', async () => {
      await request(app.getHttpServer())
        .post('/emergencies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Auth Test Emergency', country: 'CO' })
        .expect(201);
    });
  });

  describe('GET /emergencies/:emergencyId/coordination/queue (coordinator only)', () => {
    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/emergencies/${EM_ID}/coordination/queue`)
        .expect(401);
    });

    it('returns 200 with coordinator token', async () => {
      await request(app.getHttpServer())
        .get(`/emergencies/${EM_ID}/coordination/queue`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
    });

    it('returns 200 with admin token (admins bypass membership)', async () => {
      await request(app.getHttpServer())
        .get(`/emergencies/${EM_ID}/coordination/queue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('POST /resources/:id/verify (coordinator only)', () => {
    let resourceId: string;

    beforeAll(async () => {
      // Register a resource first (public endpoint)
      const res = await request(app.getHttpServer())
        .post(`/emergencies/${EM_ID}/resources`)
        .send({ type: 'warehouse', side: 'origin', name: 'Test Resource' })
        .expect(201);
      resourceId = res.body.id as string;
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/verify`)
        .send({ level: 'verified' })
        .expect(401);
    });

    it('returns 204 with coordinator token', async () => {
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ level: 'verified' })
        .expect(204);
    });
  });

  describe('Public endpoints remain accessible', () => {
    it('GET /emergencies returns 200 without token', async () => {
      await request(app.getHttpServer()).get('/emergencies').expect(200);
    });

    it('GET /emergencies/by-slug/venezuela returns 200 without token', async () => {
      await request(app.getHttpServer()).get('/emergencies/by-slug/venezuela').expect(200);
    });

    it('POST /emergencies/:id/resources (citizen registration) is public', async () => {
      await request(app.getHttpServer())
        .post(`/emergencies/${EM_ID}/resources`)
        .send({ type: 'venue', side: 'destination', name: 'Citizen Resource' })
        .expect(201);
    });
  });
});
