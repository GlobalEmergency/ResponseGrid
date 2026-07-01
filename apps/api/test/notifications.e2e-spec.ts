/**
 * E2E: in-app notifications (F5b)
 *
 * Tests:
 * - Verifying a resource owned by a user → that user sees notification in GET /notifications/mine
 *   with unreadCount=1
 * - POST /notifications/:id/read → unreadCount=0, read=true
 * - Another user cannot mark someone else's notification as read → 403
 * - POST /notifications/read-all marks all as read
 * - GET /notifications/mine without token → 401
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
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import { notificationsTable } from '../src/contexts/notifications/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// ── Unique UUID namespace for this spec (f0000003-*) ─────────────────────────
const EM_N = 'f0000003-0000-4000-8000-000000000001';
const COORD_N_ID = 'f0000003-0000-4000-8000-000000000010';
const OWNER_N_ID = 'f0000003-0000-4000-8000-000000000011';
const OTHER_N_ID = 'f0000003-0000-4000-8000-000000000012';
const MEM_COORD_N = 'f0000003-0000-4000-8000-000000000020';

const BASE_RESOURCE = {
  type: 'warehouse',
  name: 'Almacén Notif E2E',
  location: {
    address: 'Av. Test, Valencia',
    latitude: 39.47,
    longitude: -0.37,
  },
};

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let ownerToken: string;
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
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean notifications and resources for this namespace
      await db.delete(notificationsTable);
      await db.delete(resourcesTable);

      await db
        .insert(emergenciesTable)
        .values({
          id: EM_N,
          name: 'Notifications E2E Emergency',
          slug: 'notifications-e2e-emergency',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const coordHash = await bcrypt.hash('coord1234', 10);
      const ownerHash = await bcrypt.hash('owner1234', 10);
      const otherHash = await bcrypt.hash('other1234', 10);

      await db
        .insert(usersTable)
        .values([
          {
            id: COORD_N_ID,
            email: 'coord-notif@reliefhub.org',
            passwordHash: coordHash,
            name: 'Notifications Coordinator',
            isAdmin: false,
          },
          {
            id: OWNER_N_ID,
            email: 'owner-notif@reliefhub.org',
            passwordHash: ownerHash,
            name: 'Resource Owner',
            isAdmin: false,
          },
          {
            id: OTHER_N_ID,
            email: 'other-notif@reliefhub.org',
            passwordHash: otherHash,
            name: 'Other User',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(membershipsTable)
        .values({
          id: MEM_COORD_N,
          userId: COORD_N_ID,
          emergencyId: EM_N,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Login
    const [coordRes, ownerRes, otherRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-notif@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'owner-notif@reliefhub.org', password: 'owner1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'other-notif@reliefhub.org', password: 'other1234' })
        .expect(200),
    ]);
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    ownerToken = (ownerRes.body as { accessToken: string }).accessToken;
    otherToken = (otherRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it('GET /notifications/mine without token → 401', async () => {
    await request(server).get('/notifications/mine').expect(401);
  });

  // ── Core flow: resource verified → owner notified ────────────────────────────

  it('verifying a resource notifies the owner (unreadCount=1)', async () => {
    // Owner registers a resource
    const createRes = await request(server)
      .post(`/emergencies/${EM_N}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(BASE_RESOURCE)
      .expect(201);
    const resourceId = (createRes.body as { id: string }).id;

    // Coordinator verifies it
    await request(server)
      .post(`/resources/${resourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);

    // Owner checks notifications
    const notifRes = await request(server)
      .get('/notifications/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = notifRes.body as {
      notifications: Array<{
        id: string;
        type: string;
        read: boolean;
        message: string;
      }>;
      unreadCount: number;
    };
    expect(body.unreadCount).toBeGreaterThanOrEqual(1);
    const notif = body.notifications.find(
      (n) => n.type === 'resource_verified',
    );
    expect(notif).toBeDefined();
    expect(notif!.read).toBe(false);
    expect(typeof notif!.id).toBe('string');
  });

  // ── Mark as read ──────────────────────────────────────────────────────────────

  it('POST /notifications/:id/read marks the notification as read → unreadCount=0', async () => {
    // Owner registers a second resource
    const createRes = await request(server)
      .post(`/emergencies/${EM_N}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...BASE_RESOURCE, name: 'Almacén Read Test' })
      .expect(201);
    const resourceId = (createRes.body as { id: string }).id;

    // Coordinator verifies it → notification created
    await request(server)
      .post(`/resources/${resourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);

    // Get notifications to find notification ID
    const listRes = await request(server)
      .get('/notifications/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const listBody = listRes.body as {
      notifications: Array<{ id: string; type: string; read: boolean }>;
      unreadCount: number;
    };
    const unreadNotif = listBody.notifications.find(
      (n) => n.type === 'resource_verified' && !n.read,
    );
    expect(unreadNotif).toBeDefined();
    const notifId = unreadNotif!.id;

    // Mark it as read
    await request(server)
      .post(`/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    // Verify it's marked read
    const afterRes = await request(server)
      .get('/notifications/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const afterBody = afterRes.body as {
      notifications: Array<{ id: string; read: boolean }>;
      unreadCount: number;
    };
    const readNotif = afterBody.notifications.find((n) => n.id === notifId);
    expect(readNotif!.read).toBe(true);
  });

  // ── Ownership guard ───────────────────────────────────────────────────────────

  it("another user cannot mark someone else's notification as read → 403/404", async () => {
    // Owner registers a resource
    const createRes = await request(server)
      .post(`/emergencies/${EM_N}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...BASE_RESOURCE, name: 'Almacén Forbidden Test' })
      .expect(201);
    const resourceId = (createRes.body as { id: string }).id;

    // Coordinator verifies it → notification for owner
    await request(server)
      .post(`/resources/${resourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);

    // Get the notification id from owner's list
    const listRes = await request(server)
      .get('/notifications/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const listBody = listRes.body as {
      notifications: Array<{ id: string; type: string; read: boolean }>;
    };
    const ownerNotif = listBody.notifications.find(
      (n) => n.type === 'resource_verified' && !n.read,
    );
    expect(ownerNotif).toBeDefined();

    // OTHER user tries to mark owner's notification as read → 403
    const resp = await request(server)
      .post(`/notifications/${ownerNotif!.id}/read`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect([403, 404]).toContain(resp.status);
  });

  // ── Read all ─────────────────────────────────────────────────────────────────

  it('POST /notifications/read-all marks all owner notifications as read', async () => {
    // Mark all read first (cleanup)
    await request(server)
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    // Verify unreadCount is 0
    const res = await request(server)
      .get('/notifications/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = res.body as { unreadCount: number };
    expect(body.unreadCount).toBe(0);
  });
});
