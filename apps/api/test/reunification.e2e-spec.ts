/**
 * E2E: Reunification / missing persons (F01)
 *
 * Tests:
 * - POST /emergencies/:id/reunification (public anon + consent; 422 no consent; 409 paused emergency)
 * - GET /emergencies/:id/reunification (coordinator only; 403 for non-coordinator)
 * - GET /emergencies/:id/reunification/search?documentId= (coordinator)
 * - GET /emergencies/:id/reunification/mine (jwt-only)
 * - GET /reunification/:reportId (coordinator)
 * - PATCH /reunification/:reportId/status (coordinator)
 * - POST /reunification/:reportId/sightings (jwt-required)
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  membershipsTable,
  grantsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import {
  missingPersonReportsTable,
  sightingsTable,
} from '../src/contexts/reunification/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// ── Unique UUIDs for this spec (avoid PK conflicts with other specs) ──────────

const EM_R = 'e1111111-0000-4000-8000-000000000001'; // active emergency
const EM_R_PAUSED = 'e1111111-0000-4000-8000-000000000002'; // paused emergency

const COORD_R_ID = 'e1111111-0000-4000-8000-000000000010'; // coordinator
const USER_R_ID = 'e1111111-0000-4000-8000-000000000011'; // regular user
const COORD_R2_ID = 'e1111111-0000-4000-8000-000000000012'; // coordinator of another emergency

const MEM_COORD_R = 'e1111111-0000-4000-8000-000000000020';
const GRANT_OFFICER_R = 'e1111111-0000-4000-8000-000000000021';

const BASE_REPORT_BODY = {
  person: {
    firstName: 'María',
    lastName: 'García',
    documentId: 'XYZ-123',
    approximateAge: 42,
    lastKnownLocation: 'Calle Mayor 10, Valencia',
    description: 'Cabello castaño, ojos marrones',
  },
  reporter: {
    name: 'Juan García',
    phone: '+34600123456',
    email: 'juan@example.com',
  },
  consentGiven: true,
};

describe('Reunification (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let userToken: string;
  let coord2Token: string;

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
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean up in reverse FK order
      await db.delete(sightingsTable);
      await db.delete(missingPersonReportsTable);

      // Seed users
      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: COORD_R_ID,
            email: 'coord-reunification@example.com',
            passwordHash: hash,
            name: 'Coord Reunification',
            isAdmin: false,
          },
          {
            id: USER_R_ID,
            email: 'user-reunification@example.com',
            passwordHash: hash,
            name: 'User Reunification',
            isAdmin: false,
          },
          {
            id: COORD_R2_ID,
            email: 'coord2-reunification@example.com',
            passwordHash: hash,
            name: 'Coord2 Reunification',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // Seed emergencies
      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM_R,
            name: 'Reunification E2E Emergency',
            slug: 'reunification-e2e',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: EM_R_PAUSED,
            name: 'Reunification E2E Paused',
            slug: 'reunification-e2e-paused',
            country: 'ES',
            status: 'paused',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Seed membership: coord is coordinator of EM_R only
      await db
        .insert(membershipsTable)
        .values([
          {
            id: MEM_COORD_R,
            userId: COORD_R_ID,
            emergencyId: EM_R,
            role: 'coordinator',
          },
        ])
        .onConflictDoNothing();

      // Reunification accesses special-category data and is restricted to the
      // reunification_officer role (docs/features/13 §17), NOT every coordinator.
      // Grant that role to the coord user so it can reach these endpoints.
      await db
        .insert(grantsTable)
        .values([
          {
            id: GRANT_OFFICER_R,
            principalId: COORD_R_ID,
            principalType: 'user',
            roleId: 'reunification_officer',
            scopeType: 'emergency',
            scopeId: EM_R,
            grantedAt: new Date(),
          },
        ])
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Login tokens
    const [coordLogin, userLogin, coord2Login] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({
          email: 'coord-reunification@example.com',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'user-reunification@example.com',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'coord2-reunification@example.com',
          password: 'Password1!',
        })
        .expect(200),
    ]);
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;
    userToken = (userLogin.body as { accessToken: string }).accessToken;
    coord2Token = (coord2Login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /emergencies/:id/reunification ──────────────────────────────────────

  describe('POST /emergencies/:id/reunification (public)', () => {
    it('creates a report anonymously with consent → 201', async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .send(BASE_REPORT_BODY)
        .expect(201);
      const body = res.body as { id: string; status: string };
      expect(body.id).toBeDefined();
      expect(body.status).toBe('open');
    });

    it('creates a report with JWT (links userId to reporter) → 201', async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(BASE_REPORT_BODY)
        .expect(201);
      expect((res.body as { id: string }).id).toBeDefined();
    });

    it('rejects report without consent → 422', async () => {
      await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .send({ ...BASE_REPORT_BODY, consentGiven: false })
        .expect(422);
    });

    it('rejects with missing required fields → 400', async () => {
      await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .send({
          // person.firstName missing, should fail class-validator
          person: { lastName: 'García', lastKnownLocation: 'Calle Mayor' },
          reporter: { name: 'Juan', phone: '+34600123456' },
          consentGiven: true,
        })
        .expect(400);
    });

    it('rejects when emergency is paused (kill-switch) → 409', async () => {
      await request(server)
        .post(`/emergencies/${EM_R_PAUSED}/reunification`)
        .send(BASE_REPORT_BODY)
        .expect(409);
    });
  });

  // ── GET /emergencies/:id/reunification (coordinator only) ────────────────────

  describe('GET /emergencies/:id/reunification', () => {
    it('coordinator can list reports → 200 array', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_R}/reunification`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const list = res.body as Array<{ id: string; status: string }>;
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].status).toBe('open');
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .get(`/emergencies/${EM_R}/reunification`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('coordinator of another emergency gets 403', async () => {
      await request(server)
        .get(`/emergencies/${EM_R}/reunification`)
        .set('Authorization', `Bearer ${coord2Token}`)
        .expect(403);
    });

    it('unauthenticated request gets 401', async () => {
      await request(server)
        .get(`/emergencies/${EM_R}/reunification`)
        .expect(401);
    });
  });

  // ── GET .../search?documentId= ───────────────────────────────────────────────

  describe('GET /emergencies/:id/reunification/search', () => {
    it('coordinator can search by documentId → 200 array', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_R}/reunification/search?documentId=XYZ-123`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      const results = res.body as Array<{ person: { documentId: string } }>;
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach((r) => {
        expect(r.person.documentId).toBe('XYZ-123');
      });
    });

    it('search is case-insensitive (normalizes to uppercase)', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_R}/reunification/search?documentId=xyz-123`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .get(`/emergencies/${EM_R}/reunification/search?documentId=XYZ-123`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ── GET .../mine ─────────────────────────────────────────────────────────────

  describe('GET /emergencies/:id/reunification/mine', () => {
    it('authenticated user sees their own reports → 200 array', async () => {
      // Create a report linked to userToken
      const createRes = await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...BASE_REPORT_BODY,
          person: { ...BASE_REPORT_BODY.person, documentId: 'MINE-TEST-001' },
        })
        .expect(201);
      const createdId = (createRes.body as { id: string }).id;

      const res = await request(server)
        .get(`/emergencies/${EM_R}/reunification/mine`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const mine = res.body as Array<{ id: string }>;
      expect(mine.some((r) => r.id === createdId)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(server)
        .get(`/emergencies/${EM_R}/reunification/mine`)
        .expect(401);
    });
  });

  // ── Report detail, status update and sightings ───────────────────────────────

  describe('Report lifecycle (detail + status + sightings)', () => {
    let reportId: string;

    beforeAll(async () => {
      // Create a fresh report
      const res = await request(server)
        .post(`/emergencies/${EM_R}/reunification`)
        .send(BASE_REPORT_BODY)
        .expect(201);
      reportId = (res.body as { id: string }).id;
    });

    it('coordinator can get report detail → 200', async () => {
      const res = await request(server)
        .get(`/reunification/${reportId}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      const detail = res.body as {
        id: string;
        status: string;
        reporterPhone: string;
        person: { documentId: string };
      };
      expect(detail.id).toBe(reportId);
      expect(detail.status).toBe('open');
      // Sensitive fields are visible to coordinator
      expect(detail.reporterPhone).toBeDefined();
      expect(detail.person.documentId).toBe('XYZ-123');
    });

    it('non-coordinator gets 403 on detail', async () => {
      await request(server)
        .get(`/reunification/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('coordinator can update status to under_review → 204', async () => {
      await request(server)
        .patch(`/reunification/${reportId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'under_review' })
        .expect(204);

      // Verify status changed
      const res = await request(server)
        .get(`/reunification/${reportId}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect((res.body as { status: string }).status).toBe('under_review');
    });

    it('invalid transition rejects → 422', async () => {
      // under_review → open is invalid
      await request(server)
        .patch(`/reunification/${reportId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'open' })
        .expect(422);
    });

    it('authenticated user can register a sighting → 201', async () => {
      const res = await request(server)
        .post(`/reunification/${reportId}/sightings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          location: 'Parque Central, Valencia',
          note: 'Vi a alguien con esa descripción cerca del parque',
        })
        .expect(201);
      expect((res.body as { sightingId: string }).sightingId).toBeDefined();
    });

    it('unauthenticated sighting request gets 401', async () => {
      await request(server)
        .post(`/reunification/${reportId}/sightings`)
        .send({
          location: 'Calle Colón',
          note: 'Avistamiento',
        })
        .expect(401);
    });

    it('coordinator can update status to matched with matchNote → 204', async () => {
      await request(server)
        .patch(`/reunification/${reportId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          status: 'matched',
          matchNote: 'Familia localizada en albergue',
        })
        .expect(204);
    });

    it('cannot add sighting to matched report → 422', async () => {
      await request(server)
        .post(`/reunification/${reportId}/sightings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          location: 'Albergue Municipal',
          note: 'Tarde',
        })
        .expect(422);
    });
  });
});
