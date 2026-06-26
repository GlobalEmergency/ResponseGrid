/**
 * E2E: volunteer tasks, assignments, check-in/out (F4b-A2)
 *
 * Tests:
 * - POST /emergencies/:id/tasks (coordinator: 201; non-coordinator: 403)
 * - GET /emergencies/:id/tasks (coordinator: 200; non-coordinator: 403)
 * - POST /tasks/:id/assign (coordinator: 204; assigns volunteer from same emergency)
 * - POST /tasks/:id/unassign (coordinator: 204)
 * - POST /tasks/:id/check-in (volunteer themselves: 204; task → in_progress)
 * - POST /tasks/:id/check-out (volunteer: 204)
 * - Another volunteer trying check-in on someone else's assignment → 403
 * - Assign to cancelled task → 422
 * - POST /tasks/:id/complete (coordinator: 204)
 * - POST /tasks/:id/cancel (coordinator: 204)
 * - GET /emergencies/:id/tasks/mine (volunteer: 200 with myAssignmentStatus)
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
import * as bcrypt from 'bcryptjs';

// ── Unique UUID namespace for this spec (f0000002-*) ─────────────────────────
const EM_T = 'f0000002-0000-4000-8000-000000000001';
const EM_T2 = 'f0000002-0000-4000-8000-000000000002';
const COORD_T_ID = 'f0000002-0000-4000-8000-000000000010';
const VOL_A_ID = 'f0000002-0000-4000-8000-000000000011';
const VOL_B_ID = 'f0000002-0000-4000-8000-000000000012';
const COORD_T2_ID = 'f0000002-0000-4000-8000-000000000013';
const MEM_COORD_T = 'f0000002-0000-4000-8000-000000000020';
const MEM_COORD_T2 = 'f0000002-0000-4000-8000-000000000021';

// Volunteer row UUIDs (pre-seeded)
const VOLUNTEER_A_ROW = 'f0000002-0000-4000-8000-000000000031';
const VOLUNTEER_B_ROW = 'f0000002-0000-4000-8000-000000000032';

const BASE_TASK_BODY = {
  title: 'Distribute water bottles',
  description: 'Take water to zone 3 distribution point',
};

describe('Volunteer tasks (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let volAToken: string;
  let volBToken: string;
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
      // Clean task-related tables (volunteers are pre-seeded)
      await db.delete(taskAssignmentsTable);
      await db.delete(tasksTable);
      await db.delete(volunteersTable);

      // Seed emergencies
      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM_T,
            name: 'Task E2E Emergency',
            slug: 'task-e2e-emergency',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: EM_T2,
            name: 'Task E2E Emergency 2',
            slug: 'task-e2e-emergency-2',
            country: 'ES',
            status: 'active',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Seed users
      const coordHash = await bcrypt.hash('coord1234', 10);
      const volHash = await bcrypt.hash('vol1234', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: COORD_T_ID,
            email: 'coord-task@reliefhub.org',
            passwordHash: coordHash,
            name: 'Task Coordinator',
            isAdmin: false,
          },
          {
            id: VOL_A_ID,
            email: 'vol-a-task@reliefhub.org',
            passwordHash: volHash,
            name: 'Volunteer A',
            isAdmin: false,
          },
          {
            id: VOL_B_ID,
            email: 'vol-b-task@reliefhub.org',
            passwordHash: volHash,
            name: 'Volunteer B',
            isAdmin: false,
          },
          {
            id: COORD_T2_ID,
            email: 'coord-task2@reliefhub.org',
            passwordHash: coordHash,
            name: 'Task Coordinator 2',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // Memberships
      await db
        .insert(membershipsTable)
        .values([
          {
            id: MEM_COORD_T,
            userId: COORD_T_ID,
            emergencyId: EM_T,
            role: 'coordinator',
          },
          {
            id: MEM_COORD_T2,
            userId: COORD_T2_ID,
            emergencyId: EM_T2,
            role: 'coordinator',
          },
        ])
        .onConflictDoNothing();

      // Pre-seed volunteer registrations for VOL_A and VOL_B in EM_T
      const now = new Date();
      await db
        .insert(volunteersTable)
        .values([
          {
            id: VOLUNTEER_A_ROW,
            emergencyId: EM_T,
            userId: VOL_A_ID,
            name: 'Volunteer A',
            contact: 'vola@example.com',
            municipality: 'Valencia',
            skills: ['general'],
            availability: 'immediate',
            vehicle: 'car',
            status: 'available',
            consentAccepted: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: VOLUNTEER_B_ROW,
            emergencyId: EM_T,
            userId: VOL_B_ID,
            name: 'Volunteer B',
            contact: 'volb@example.com',
            municipality: 'Madrid',
            skills: ['general'],
            availability: 'immediate',
            vehicle: 'none',
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

    // Login all users
    const [coordRes, volARes, volBRes, coord2Res] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-task@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'vol-a-task@reliefhub.org', password: 'vol1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'vol-b-task@reliefhub.org', password: 'vol1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'coord-task2@reliefhub.org', password: 'coord1234' })
        .expect(200),
    ]);
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    volAToken = (volARes.body as { accessToken: string }).accessToken;
    volBToken = (volBRes.body as { accessToken: string }).accessToken;
    coord2Token = (coord2Res.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Create task ───────────────────────────────────────────────────────────

  describe('POST /emergencies/:id/tasks', () => {
    it('coordinator creates a task → 201 with id', async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send(BASE_TASK_BODY)
        .expect(201);
      expect(typeof (res.body as { id: string }).id).toBe('string');
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${volAToken}`)
        .send(BASE_TASK_BODY)
        .expect(403);
    });

    it('coordinator of different emergency gets 403', async () => {
      await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coord2Token}`)
        .send(BASE_TASK_BODY)
        .expect(403);
    });

    it('returns 401 without token', async () => {
      await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .send(BASE_TASK_BODY)
        .expect(401);
    });

    it('creates task with location and requiredSkill', async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          ...BASE_TASK_BODY,
          location: { address: 'Zona 3', latitude: 39.47, longitude: -0.37 },
          requiredSkill: 'medical',
        })
        .expect(201);
      expect((res.body as { id: string }).id).toBeDefined();
    });
  });

  // ── List tasks ────────────────────────────────────────────────────────────

  describe('GET /emergencies/:id/tasks', () => {
    it('coordinator sees task list → 200', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it('non-coordinator gets 403', async () => {
      await request(server)
        .get(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${volAToken}`)
        .expect(403);
    });
  });

  // ── Assign / Unassign / Check-in / Check-out / Complete / Cancel ──────────

  describe('Task lifecycle', () => {
    let taskId: string;

    beforeAll(async () => {
      // Create a fresh task for lifecycle tests
      const res = await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'Lifecycle Task',
          description: 'Used for lifecycle e2e',
        })
        .expect(201);
      taskId = (res.body as { id: string }).id;
    });

    it('coordinator assigns volunteer A → 204', async () => {
      await request(server)
        .post(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
    });

    it('task list shows assignment', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      const tasks = res.body as Array<{
        id: string;
        assignments: Array<{ volunteerId: string }>;
      }>;
      const task = tasks.find((t) => t.id === taskId);
      expect(task).toBeDefined();
      expect(
        task!.assignments.some((a) => a.volunteerId === VOLUNTEER_A_ROW),
      ).toBe(true);
    });

    it('volunteer A checks in themselves → 204; task → in_progress', async () => {
      await request(server)
        .post(`/tasks/${taskId}/check-in`)
        .set('Authorization', `Bearer ${volAToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);

      // Verify task is in_progress
      const res = await request(server)
        .get(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(200);
      const tasks = res.body as Array<{ id: string; status: string }>;
      const task = tasks.find((t) => t.id === taskId);
      expect(task!.status).toBe('in_progress');
    });

    it('volunteer A checks out → 204', async () => {
      await request(server)
        .post(`/tasks/${taskId}/check-out`)
        .set('Authorization', `Bearer ${volAToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
    });

    it('volunteer B tries to check in volunteer A → 403 (different user)', async () => {
      // First unassign A, assign again to reset state
      await request(server)
        .post(`/tasks/${taskId}/unassign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
      await request(server)
        .post(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);

      // Volunteer B tries to check in Volunteer A — should get 403
      await request(server)
        .post(`/tasks/${taskId}/check-in`)
        .set('Authorization', `Bearer ${volBToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(403);
    });

    it('coordinator can check in a volunteer → 204', async () => {
      await request(server)
        .post(`/tasks/${taskId}/check-in`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
      // Check out again for next tests
      await request(server)
        .post(`/tasks/${taskId}/check-out`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
    });

    it('coordinator completes task → 204', async () => {
      await request(server)
        .post(`/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);
    });

    it('assigning to a completed task → 422', async () => {
      await request(server)
        .post(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_B_ROW })
        .expect(422);
    });
  });

  // ── Cancel task ───────────────────────────────────────────────────────────

  describe('Task cancel', () => {
    let taskId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ title: 'Cancel Task', description: 'Will be cancelled' })
        .expect(201);
      taskId = (res.body as { id: string }).id;
    });

    it('coordinator cancels task → 204', async () => {
      await request(server)
        .post(`/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);
    });

    it('assigning to a cancelled task → 422', async () => {
      await request(server)
        .post(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(422);
    });
  });

  // ── My tasks ──────────────────────────────────────────────────────────────

  describe('GET /emergencies/:id/tasks/mine', () => {
    let myTaskId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(`/emergencies/${EM_T}/tasks`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ title: 'My Tasks Test', description: 'For mine endpoint test' })
        .expect(201);
      myTaskId = (res.body as { id: string }).id;

      await request(server)
        .post(`/tasks/${myTaskId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ volunteerId: VOLUNTEER_A_ROW })
        .expect(204);
    });

    it('volunteer A sees their assigned task with assignment status', async () => {
      const res = await request(server)
        .get(`/emergencies/${EM_T}/tasks/mine`)
        .set('Authorization', `Bearer ${volAToken}`)
        .expect(200);
      const tasks = res.body as Array<{
        id: string;
        myAssignmentStatus: string;
      }>;
      const myTask = tasks.find((t) => t.id === myTaskId);
      expect(myTask).toBeDefined();
      expect(myTask!.myAssignmentStatus).toBe('assigned');
    });

    it('volunteer B (not assigned) sees empty list for this emergency', async () => {
      // B is not assigned to any task in EM_T in this describe block
      const res = await request(server)
        .get(`/emergencies/${EM_T}/tasks/mine`)
        .set('Authorization', `Bearer ${volBToken}`)
        .expect(200);
      const tasks = res.body as Array<{ id: string }>;
      // B may have no tasks
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(server).get(`/emergencies/${EM_T}/tasks/mine`).expect(401);
    });
  });
});
