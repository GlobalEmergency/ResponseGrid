/**
 * E2E: Emergency lifecycle — F1 feature.
 *
 * Covers:
 * - Coordinator can pause (Active → Paused) and resume (Paused → Active)
 * - POST /emergencies/:id/resources returns 409 when emergency is Paused
 * - POST /emergencies/:id/needs returns 409 when emergency is Paused
 * - After resume, resources and needs return 201 again
 * - PUT /emergencies/:id/announcement persists the message and it appears in the public view
 * - A non-coordinator gets 403 on lifecycle endpoints
 * - Double pause returns 409 (invalid transition)
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { EmergencyExceptionFilter } from '../src/contexts/emergencies/infrastructure/http/emergency-exception.filter';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// Unique emergency ID for this spec
const EM_LC = 'f1000000-0000-4000-8000-000000000001';
// Unique user IDs to avoid PK conflicts with other e2e specs
const COORD_LC_ID = 'f1000000-0000-4000-8000-000000000002';
const OTHER_ID = 'f1000000-0000-4000-8000-000000000003';
const MEMBERSHIP_LC_ID = 'f1000000-0000-4000-8000-000000000004';

const baseLocation = {
  address: 'Calle Lifecycle 1, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

const baseNeedBody = {
  title: 'Lifecycle test need',
  location: baseLocation,
  priority: 'high',
  items: [{ name: 'Water', quantity: 10, unit: 'liters', category: 'water' }],
};

describe('Emergency lifecycle (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let otherToken: string;

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
      new EmergencyExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Seed the emergency (Active, no announcement)
      await db
        .insert(emergenciesTable)
        .values({
          id: EM_LC,
          name: 'Lifecycle E2E Emergency',
          slug: 'lifecycle-e2e-emergency',
          country: 'ES',
          status: 'active',
          announcement: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      // Coordinator user
      await db
        .insert(usersTable)
        .values({
          id: COORD_LC_ID,
          email: 'coord-lc@reliefhub.org',
          passwordHash: await bcrypt.hash('coord1234', 10),
          name: 'Lifecycle Coordinator',
          isAdmin: false,
        })
        .onConflictDoNothing();

      // Other user (non-coordinator)
      await db
        .insert(usersTable)
        .values({
          id: OTHER_ID,
          email: 'other-lc@reliefhub.org',
          passwordHash: await bcrypt.hash('other1234', 10),
          name: 'Other User',
          isAdmin: false,
        })
        .onConflictDoNothing();

      // Membership: coordinator → EM_LC
      await db
        .insert(membershipsTable)
        .values({
          id: MEMBERSHIP_LC_ID,
          userId: COORD_LC_ID,
          emergencyId: EM_LC,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Obtain tokens
    const coordLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'coord-lc@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;

    const otherLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'other-lc@reliefhub.org', password: 'other1234' })
      .expect(200);
    otherToken = (otherLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── 1. Non-coordinator gets 403 ─────────────────────────────────────────────

  it('non-coordinator cannot pause → 403', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/pause`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('non-coordinator cannot publish announcement → 403', async () => {
    await request(server)
      .put(`/emergencies/${EM_LC}/announcement`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ message: 'Unauthorized announcement' })
      .expect(403);
  });

  // ── 2. Pause the emergency ───────────────────────────────────────────────────

  it('coordinator pauses the emergency → 204', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/pause`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);
  });

  it('double pause → 409 (invalid transition)', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/pause`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(409);
  });

  // ── 3. Kill-switch: resources and needs rejected while paused ───────────────

  it('POST /emergencies/:id/resources → 409 when emergency is paused', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name: 'Blocked Resource',
        location: baseLocation,
      })
      .expect(409);
  });

  it('POST /emergencies/:id/needs → 409 when emergency is paused', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send(baseNeedBody)
      .expect(409);
  });

  // ── 4. Announcement works regardless of status ──────────────────────────────

  it('coordinator publishes announcement while paused → 204', async () => {
    await request(server)
      .put(`/emergencies/${EM_LC}/announcement`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ message: 'Pause in effect — no intake accepted.' })
      .expect(204);
  });

  it('announcement appears in the public view by slug', async () => {
    const res = await request(server)
      .get('/emergencies/by-slug/lifecycle-e2e-emergency')
      .expect(200);
    const body = res.body as {
      status: string;
      announcement: string | null;
      updatedAt: string;
    };
    expect(body.status).toBe('paused');
    expect(body.announcement).toBe('Pause in effect — no intake accepted.');
    expect(typeof body.updatedAt).toBe('string');
  });

  // ── 5. Resume: intake resumes ───────────────────────────────────────────────

  it('coordinator resumes the emergency → 204', async () => {
    await request(server)
      .post(`/emergencies/${EM_LC}/resume`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);
  });

  it('POST /emergencies/:id/resources → 201 after resume', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM_LC}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name: 'Resumed Resource',
        location: baseLocation,
      })
      .expect(201);
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  it('POST /emergencies/:id/needs → 201 after resume', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM_LC}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send(baseNeedBody)
      .expect(201);
    expect(typeof (res.body as { id: string }).id).toBe('string');
  });

  // ── 6. Public view reflects resumed status ───────────────────────────────────

  it('public view shows status=active and announcement still set', async () => {
    const res = await request(server)
      .get('/emergencies/by-slug/lifecycle-e2e-emergency')
      .expect(200);
    const body = res.body as {
      status: string;
      announcement: string | null;
    };
    expect(body.status).toBe('active');
    expect(body.announcement).toBe('Pause in effect — no intake accepted.');
  });

  // ── 7. Unauthenticated cannot reach lifecycle endpoints ──────────────────────

  it('no token → 401 on pause', async () => {
    await request(server).post(`/emergencies/${EM_LC}/pause`).expect(401);
  });
});
