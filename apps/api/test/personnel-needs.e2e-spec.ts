/**
 * E2E: F05 — Personnel needs ↔ volunteers
 *
 * Tests:
 * - POST /emergencies/:id/needs with requiredSkill=medical + requestedCount=2 → 201
 * - GET /emergencies/:id/public/needs does NOT expose skillSpecialty
 * - GET /needs/:needId/volunteer-suggestions returns active medical volunteers of that emergency
 * - GET /needs/:needId/volunteer-suggestions does NOT return volunteers from other emergencies
 * - POST /needs/:needId/create-task creates Task with linkedNeedId set
 * - POST /needs/:needId/create-task assigns volunteerIds correctly
 * - Non-coordinator on suggestions → 403
 * - Non-coordinator on create-task → 403
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
import { volunteersTable } from '../src/contexts/volunteers/infrastructure/drizzle/schema';
import {
  tasksTable,
  taskAssignmentsTable,
} from '../src/contexts/volunteers/infrastructure/drizzle/task-schema';
import {
  needsTable,
  needItemsTable,
} from '../src/contexts/needs/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// ── Unique UUID namespace for F05 e2e spec (f0500002-*) ──────────────────────
const EM_P = 'f0500002-0000-4000-8000-000000000001'; // personnel emergency
const EM_OTHER = 'f0500002-0000-4000-8000-000000000002'; // other emergency

const COORD_P_ID = 'f0500002-0000-4000-8000-000000000010';
const OTHER_USER_ID = 'f0500002-0000-4000-8000-000000000011';
const VOL_MED_A_ID = 'f0500002-0000-4000-8000-000000000012'; // user of medical vol A
const VOL_MED_B_ID = 'f0500002-0000-4000-8000-000000000013'; // user of medical vol B

const MEM_COORD_P = 'f0500002-0000-4000-8000-000000000020';

// Volunteer row IDs
const VOL_MED_A_ROW = 'f0500002-0000-4000-8000-000000000031';
const VOL_MED_B_ROW = 'f0500002-0000-4000-8000-000000000032';
const VOL_LOGISTICS_ROW = 'f0500002-0000-4000-8000-000000000033'; // logistics — should NOT appear
const VOL_OTHER_EM_ROW = 'f0500002-0000-4000-8000-000000000034'; // medical but OTHER emergency

describe('Personnel needs — F05 (e2e)', () => {
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
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean relevant tables
      await db.delete(taskAssignmentsTable);
      await db.delete(tasksTable);
      await db.delete(needItemsTable);
      await db.delete(needsTable);
      await db.delete(volunteersTable);

      // Seed emergencies
      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM_P,
            name: 'Personnel E2E Emergency',
            slug: 'personnel-e2e-em',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: EM_OTHER,
            name: 'Other E2E Emergency',
            slug: 'other-personnel-e2e-em',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Seed users
      const coordHash = await bcrypt.hash('coord1234', 10);
      const otherHash = await bcrypt.hash('other1234', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: COORD_P_ID,
            email: 'coord-personnel@reliefhub.org',
            passwordHash: coordHash,
            name: 'Personnel Coordinator',
            isAdmin: false,
          },
          {
            id: OTHER_USER_ID,
            email: 'other-personnel@reliefhub.org',
            passwordHash: otherHash,
            name: 'Other User',
            isAdmin: false,
          },
          {
            id: VOL_MED_A_ID,
            email: 'vol-med-a@reliefhub.org',
            passwordHash: otherHash,
            name: 'Medical Volunteer A',
            isAdmin: false,
          },
          {
            id: VOL_MED_B_ID,
            email: 'vol-med-b@reliefhub.org',
            passwordHash: otherHash,
            name: 'Medical Volunteer B',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // Memberships
      await db
        .insert(membershipsTable)
        .values([
          {
            id: MEM_COORD_P,
            userId: COORD_P_ID,
            emergencyId: EM_P,
            role: 'coordinator',
          },
        ])
        .onConflictDoNothing();

      // Seed volunteers
      const now = new Date();
      await db
        .insert(volunteersTable)
        .values([
          {
            id: VOL_MED_A_ROW,
            emergencyId: EM_P,
            userId: VOL_MED_A_ID,
            name: 'Medical Volunteer A',
            contact: 'meda@example.com',
            municipality: 'Valencia',
            skills: ['medical'],
            availability: 'immediate',
            vehicle: 'car',
            status: 'available',
            consentAccepted: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: VOL_MED_B_ROW,
            emergencyId: EM_P,
            userId: VOL_MED_B_ID,
            name: 'Medical Volunteer B',
            contact: 'medb@example.com',
            municipality: 'Madrid',
            skills: ['medical', 'general'],
            availability: 'immediate',
            vehicle: 'none',
            status: 'available',
            consentAccepted: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: VOL_LOGISTICS_ROW,
            emergencyId: EM_P,
            userId: COORD_P_ID, // reuse user — not signing in as volunteer
            name: 'Logistics Volunteer',
            contact: 'log@example.com',
            municipality: 'Barcelona',
            skills: ['logistics'],
            availability: 'flexible',
            vehicle: 'van',
            status: 'available',
            consentAccepted: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: VOL_OTHER_EM_ROW,
            emergencyId: EM_OTHER,
            userId: OTHER_USER_ID,
            name: 'Medical in Other Emergency',
            contact: 'other@example.com',
            municipality: 'Sevilla',
            skills: ['medical'],
            availability: 'immediate',
            vehicle: 'car',
            status: 'available',
            consentAccepted: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Login
    const [coordRes, otherRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-personnel@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'other-personnel@reliefhub.org', password: 'other1234' })
        .expect(200),
    ]);
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    otherToken = (otherRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Create personnel need ─────────────────────────────────────────────────

  describe('POST /emergencies/:id/needs with personnel fields', () => {
    it('creates a need with requiredSkill=medical and requestedCount=2 → 201', async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_P}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Médicos de guardia',
          location: {
            address: 'Hospital Central, Valencia',
            latitude: 39.47,
            longitude: -0.38,
          },
          priority: 'high',
          items: [
            {
              name: 'Personal médico',
              quantity: 2,
              category: 'medical_personnel',
            },
          ],
          requiredSkill: 'medical',
          skillSpecialty: 'Urgencias pediátricas',
          requestedCount: 2,
        })
        .expect(201);

      expect(typeof (res.body as { id: string }).id).toBe('string');
    });

    it('rejects requestedCount < 1 → 400', async () => {
      await request(server)
        .post(`/emergencies/${EM_P}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Invalid need',
          location: { address: 'Somewhere', latitude: 39.47, longitude: -0.38 },
          priority: 'high',
          items: [
            { name: 'Staff', quantity: 1, category: 'medical_personnel' },
          ],
          requestedCount: 0,
        })
        .expect(400);
    });
  });

  // ── Public needs DTO omits skillSpecialty ─────────────────────────────────

  describe('GET /emergencies/:id/public/needs — DTO omits skillSpecialty', () => {
    it('does not expose skillSpecialty in public need list', async () => {
      // Validate and expose the need first (create + validate)
      const createRes = await request(server)
        .post(`/emergencies/${EM_P}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Public need test',
          location: {
            address: 'Centro de Valencia',
            latitude: 39.47,
            longitude: -0.38,
          },
          priority: 'medium',
          items: [
            { name: 'Staff', quantity: 1, category: 'medical_personnel' },
          ],
          requiredSkill: 'medical',
          skillSpecialty: 'SuperSecret specialty',
          requestedCount: 1,
        })
        .expect(201);

      const needId = (createRes.body as { id: string }).id;

      // Validate
      await request(server)
        .post(`/needs/${needId}/validate`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);

      // Get public list
      const publicRes = await request(server)
        .get(`/emergencies/${EM_P}/public/needs`)
        .expect(200);

      const needs = publicRes.body as Array<Record<string, unknown>>;
      const found = needs.find((n) => n['id'] === needId);
      expect(found).toBeDefined();
      // skillSpecialty must NOT be present
      expect('skillSpecialty' in (found as object)).toBe(false);
      // requiredSkill and requestedCount should be present
      expect(found?.['requiredSkill']).toBe('medical');
      expect(found?.['requestedCount']).toBe(1);
    });
  });

  // ── Volunteer suggestions ─────────────────────────────────────────────────

  describe('GET /needs/:needId/volunteer-suggestions', () => {
    let needId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_P}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Need for suggestions',
          location: { address: 'Somewhere', latitude: 39.47, longitude: -0.38 },
          priority: 'high',
          items: [
            { name: 'Staff', quantity: 2, category: 'medical_personnel' },
          ],
          requiredSkill: 'medical',
          requestedCount: 2,
        })
        .expect(201);
      needId = (res.body as { id: string }).id;
    });

    it('returns medical volunteers from this emergency → 200', async () => {
      const res = await request(server)
        .get(`/needs/${needId}/volunteer-suggestions`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);

      const suggestions = res.body as Array<{
        volunteerId: string;
        skills: string[];
      }>;
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      for (const s of suggestions) {
        expect(s.skills).toContain('medical');
      }
    });

    it('does NOT return volunteers from another emergency', async () => {
      const res = await request(server)
        .get(`/needs/${needId}/volunteer-suggestions`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);

      const ids = (res.body as Array<{ volunteerId: string }>).map(
        (s) => s.volunteerId,
      );
      expect(ids).not.toContain(VOL_OTHER_EM_ROW);
    });

    it('does NOT return non-medical volunteers (logistics)', async () => {
      const res = await request(server)
        .get(`/needs/${needId}/volunteer-suggestions`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);

      const ids = (res.body as Array<{ volunteerId: string }>).map(
        (s) => s.volunteerId,
      );
      expect(ids).not.toContain(VOL_LOGISTICS_ROW);
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .get(`/needs/${needId}/volunteer-suggestions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('respects ?limit query param', async () => {
      const res = await request(server)
        .get(`/needs/${needId}/volunteer-suggestions?limit=1`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect((res.body as unknown[]).length).toBeLessThanOrEqual(1);
    });
  });

  // ── Create task from need ─────────────────────────────────────────────────

  describe('POST /needs/:needId/create-task', () => {
    let needId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_P}/needs`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Need for task creation',
          location: { address: 'Hospital', latitude: 39.47, longitude: -0.38 },
          priority: 'high',
          items: [
            { name: 'Staff', quantity: 1, category: 'medical_personnel' },
          ],
          requiredSkill: 'medical',
          requestedCount: 1,
        })
        .expect(201);
      needId = (res.body as { id: string }).id;
    });

    it('creates a Task linked to the need → 201 with linkedNeedId', async () => {
      const res = await request(server)
        .post(`/needs/${needId}/create-task`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerIds: [VOL_MED_A_ROW] })
        .expect(201);

      const body = res.body as {
        id: string;
        linkedNeedId: string | null;
        assignments: Array<{ volunteerId: string }>;
      };
      expect(body.id).toBeDefined();
      expect(body.linkedNeedId).toBe(needId);
      expect(body.assignments.map((a) => a.volunteerId)).toContain(
        VOL_MED_A_ROW,
      );
    });

    it('creates a Task with multiple volunteerIds assigned', async () => {
      const res = await request(server)
        .post(`/needs/${needId}/create-task`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerIds: [VOL_MED_A_ROW, VOL_MED_B_ROW] })
        .expect(201);

      const body = res.body as {
        assignments: Array<{ volunteerId: string }>;
      };
      const assignedIds = body.assignments.map((a) => a.volunteerId);
      expect(assignedIds).toContain(VOL_MED_A_ROW);
      expect(assignedIds).toContain(VOL_MED_B_ROW);
    });

    it('creates a Task with no volunteerIds → empty assignments', async () => {
      const res = await request(server)
        .post(`/needs/${needId}/create-task`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(201);

      const body = res.body as { assignments: unknown[] };
      expect(body.assignments).toHaveLength(0);
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .post(`/needs/${needId}/create-task`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({})
        .expect(403);
    });

    it('unknown need → 404', async () => {
      await request(server)
        .post('/needs/00000000-0000-4000-8000-000000000099/create-task')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(404);
    });
  });
});
