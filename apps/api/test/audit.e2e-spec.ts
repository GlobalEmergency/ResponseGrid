/**
 * E2E: audit log (F5c)
 *
 * Tests:
 * - A mutating request (coordinator verifies a resource) → GET /audit as admin
 *   shows an entry with the correct action and actorUserId.
 * - A GET request does NOT produce an audit entry.
 * - A non-admin user hitting GET /audit → 403.
 * - GET /audit without auth → 401.
 * - Filtering by emergencyId returns only matching entries.
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
import { auditLogTable } from '../src/contexts/audit/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// ── Unique UUID namespace for this spec (f0000099-*) ──────────────────────────
const EM_ID = 'f0000099-0000-4000-8000-000000000001';
const ADMIN_ID = 'f0000099-0000-4000-8000-000000000010';
const COORD_ID = 'f0000099-0000-4000-8000-000000000011';
const OTHER_ID = 'f0000099-0000-4000-8000-000000000012';
const MEM_COORD = 'f0000099-0000-4000-8000-000000000020';

describe('Audit log (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
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
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean audit entries and resources for this namespace
      await db.delete(auditLogTable);
      await db.delete(resourcesTable);

      await db
        .insert(emergenciesTable)
        .values({
          id: EM_ID,
          name: 'Audit E2E Emergency',
          slug: 'audit-e2e-emergency',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const adminHash = await bcrypt.hash('admin1234', 10);
      const coordHash = await bcrypt.hash('coord1234', 10);
      const otherHash = await bcrypt.hash('other1234', 10);

      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'admin-audit@reliefhub.org',
            passwordHash: adminHash,
            name: 'Admin Audit',
            isAdmin: true,
          },
          {
            id: COORD_ID,
            email: 'coord-audit@reliefhub.org',
            passwordHash: coordHash,
            name: 'Coordinator Audit',
            isAdmin: false,
          },
          {
            id: OTHER_ID,
            email: 'other-audit@reliefhub.org',
            passwordHash: otherHash,
            name: 'Other Audit',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(membershipsTable)
        .values({
          id: MEM_COORD,
          userId: COORD_ID,
          emergencyId: EM_ID,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Obtain tokens
    const [adminRes, coordRes, otherRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'admin-audit@reliefhub.org', password: 'admin1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-audit@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'other-audit@reliefhub.org', password: 'other1234' })
        .expect(200),
    ]);
    adminToken = (adminRes.body as { accessToken: string }).accessToken;
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    otherToken = (otherRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it('GET /audit without token → 401', async () => {
    await request(server).get('/audit').expect(401);
  });

  it('GET /audit as non-admin → 403', async () => {
    await request(server)
      .get('/audit')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  // ── Core flow: mutation creates audit entry ──────────────────────────────────

  it('verifying a resource creates an audit entry with correct action and actorUserId', async () => {
    // Coordinator registers a resource
    const createRes = await request(server)
      .post(`/emergencies/${EM_ID}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'warehouse',
        name: 'Audit E2E Resource',
        location: {
          address: 'Calle Audit, Valencia',
          latitude: 39.47,
          longitude: -0.37,
        },
      })
      .expect(201);
    const resourceId = (createRes.body as { id: string }).id;

    // Coordinator verifies the resource
    await request(server)
      .post(`/resources/${resourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);

    // Allow the fire-and-forget audit write to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Admin reads audit log
    const auditRes = await request(server)
      .get('/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = auditRes.body as {
      entries: Array<{
        id: string;
        actorUserId: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        emergencyId: string | null;
        method: string;
        statusCode: number;
      }>;
      total: number;
    };

    expect(body.total).toBeGreaterThanOrEqual(1);

    // Find the verify entry
    const verifyEntry = body.entries.find(
      (e) => e.action === 'resource.verify',
    );
    expect(verifyEntry).toBeDefined();
    expect(verifyEntry!.actorUserId).toBe(COORD_ID);
    expect(verifyEntry!.entityType).toBe('resource');
    expect(verifyEntry!.entityId).toBe(resourceId);
    expect(verifyEntry!.method).toBe('POST');
    expect(verifyEntry!.statusCode).toBe(204);
  });

  // ── GET does not produce audit entry ────────────────────────────────────────

  it('GET requests do not produce audit entries', async () => {
    // Clear existing audit entries
    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(auditLogTable);
    } finally {
      await pool.end();
    }

    // Make a GET request (read-only)
    await request(server)
      .get('/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Wait briefly
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Audit should still be empty (GET /audit doesn't log itself)
    const afterRes = await request(server)
      .get('/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const afterBody = afterRes.body as { total: number };
    expect(afterBody.total).toBe(0);
  });

  // ── emergencyId filter ───────────────────────────────────────────────────────

  it('filtering by emergencyId returns only matching entries', async () => {
    // Register + verify a resource (creates entries tagged with EM_ID)
    const createRes = await request(server)
      .post(`/emergencies/${EM_ID}/resources`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        type: 'warehouse',
        name: 'Audit Filter Resource',
        location: {
          address: 'Calle Filter, Valencia',
          latitude: 39.47,
          longitude: -0.37,
        },
      })
      .expect(201);
    const resourceId = (createRes.body as { id: string }).id;

    await request(server)
      .post(`/resources/${resourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const filteredRes = await request(server)
      .get(`/audit?emergencyId=${EM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const filteredBody = filteredRes.body as {
      entries: Array<{ emergencyId: string | null }>;
      total: number;
    };

    expect(filteredBody.total).toBeGreaterThanOrEqual(1);
    for (const entry of filteredBody.entries) {
      expect(entry.emergencyId).toBe(EM_ID);
    }
  });
});
