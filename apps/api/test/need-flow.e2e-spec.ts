import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import {
  needsTable,
  needItemsTable,
} from '../src/contexts/needs/infrastructure/drizzle/schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = '33333333-3333-4333-8333-333333333333';
const COORD_ID = 'ff000000-0000-4000-8000-000000000006';
const MEMBERSHIP_ID = 'ff100000-0000-4000-8000-000000000007';
const ORG_ID = 'ee000000-0000-4000-8000-000000000009';

// Base body for creating a need
const baseNeedBody = {
  title: 'Food supplies for 100 families',
  description: 'Urgent food needed near the shelter',
  location: {
    address: 'Avenida Principal, Caracas, Venezuela',
    latitude: 10.4806,
    longitude: -66.9036,
  },
  priority: 'high',
  items: [
    { name: 'Rice bags', quantity: 100, unit: 'kg', category: 'food' },
    { name: 'Water bottles', quantity: 200, unit: 'liters', category: 'water' },
  ],
};

type NeedItem = {
  id: string;
  status: string;
  items: unknown[];
  location: unknown;
  description: string | null;
  managingOrganizationId: string | null;
  priority: string;
};

function bodyId(res: { body: unknown }): string {
  return (res.body as { id: string }).id;
}

function bodyList(res: { body: unknown }): NeedItem[] {
  return res.body as NeedItem[];
}

describe('Need flow (e2e)', () => {
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
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new NeedsDomainExceptionFilter(),
    );
    await app.init();

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(needItemsTable);
      await db.delete(needsTable);
      // Ensure the emergency exists so the intake kill-switch allows creation
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Need Flow Emergency',
          slug: 'need-flow-emergency',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();
      // Insert coordinator user and membership (guard against existing rows)
      await db
        .insert(usersTable)
        .values({
          id: COORD_ID,
          email: 'coord-needs@reliefhub.org',
          passwordHash: await bcrypt.hash('coord1234', 10),
          name: 'Needs Coordinator',
          isAdmin: false,
        })
        .onConflictDoNothing();
      await db
        .insert(membershipsTable)
        .values({
          id: MEMBERSHIP_ID,
          userId: COORD_ID,
          emergencyId: EM,
          role: 'coordinator',
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    server = app.getHttpServer() as Server;

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'coord-needs@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST without token → 401', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .send(baseNeedBody)
      .expect(401);
  });

  it('full flow: create (auth) → queue (coord) → validate → public/needs → assign-manager', async () => {
    // 1. Create need with auth (2 items + location)
    const created = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send(baseNeedBody)
      .expect(201);

    const id: string = bodyId(created);
    expect(id).toBeDefined();

    // 2. No token → 401 on queue
    await request(server).get(`/emergencies/${EM}/needs/queue`).expect(401);

    // 3. Coordinator: appears in queue with items and location
    const queue = await request(server)
      .get(`/emergencies/${EM}/needs/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const queuedNeed = bodyList(queue).find((n) => n.id === id);
    expect(queuedNeed).toBeDefined();
    expect(queuedNeed?.status).toBe('pending');
    expect(queuedNeed?.items).toHaveLength(2);
    expect((queuedNeed?.items as Array<{ name: string }>)[0].name).toBe(
      'Rice bags',
    );
    expect((queuedNeed?.items as Array<{ name: string }>)[1].name).toBe(
      'Water bottles',
    );
    expect((queuedNeed?.location as { address: string }).address).toBe(
      'Avenida Principal, Caracas, Venezuela',
    );
    expect((queuedNeed?.location as { latitude: number }).latitude).toBe(
      10.4806,
    );
    expect(queuedNeed?.description).toBe('Urgent food needed near the shelter');

    // 4. Public needs: empty (not validated yet)
    const publicBefore = await request(server)
      .get(`/emergencies/${EM}/public/needs`)
      .expect(200);
    expect(bodyList(publicBefore).find((n) => n.id === id)).toBeUndefined();

    // 5. Coordinator: validate
    await request(server)
      .post(`/needs/${id}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // 6. Queue: need no longer pending
    const queueAfter = await request(server)
      .get(`/emergencies/${EM}/needs/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect(bodyList(queueAfter).find((n) => n.id === id)).toBeUndefined();

    // 7. Public needs: now shows validated need with items and location
    const publicAfter = await request(server)
      .get(`/emergencies/${EM}/public/needs`)
      .expect(200);

    const publicNeed = bodyList(publicAfter).find((n) => n.id === id);
    expect(publicNeed).toBeDefined();
    expect(publicNeed?.status).toBe('validated');
    expect(publicNeed?.items).toHaveLength(2);
    expect(publicNeed?.location).toBeDefined();
    expect(publicNeed?.managingOrganizationId).toBeNull();

    // 8. Assign manager
    await request(server)
      .post(`/needs/${id}/assign-manager`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ organizationId: ORG_ID })
      .expect(204);

    // 9. Verify managingOrganizationId appears in public view
    const publicAssigned = await request(server)
      .get(`/emergencies/${EM}/public/needs`)
      .expect(200);
    const assignedNeed = bodyList(publicAssigned).find((n) => n.id === id);
    expect(assignedNeed?.managingOrganizationId).toBe(ORG_ID);
  });

  it('validate on non-existent need returns 404', async () => {
    await request(server)
      .post('/needs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/validate')
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(404);
  });

  it('validate already-validated need returns 409', async () => {
    const created = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Duplicate validate test',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'medium',
        items: [
          {
            name: 'Medical kits',
            quantity: 5,
            unit: 'kits',
            category: 'medical',
          },
        ],
      })
      .expect(201);
    const id: string = bodyId(created);

    await request(server)
      .post(`/needs/${id}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // Second validate → 409 (not pending)
    await request(server)
      .post(`/needs/${id}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(409);
  });

  it('create need without required fields returns 400', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ title: 'Missing items and location', priority: 'high' })
      .expect(400);
  });

  it('create need with empty items array returns 400', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'No items',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'high',
        items: [],
      })
      .expect(400);
  });

  it('assign-manager on non-existent need returns 404', async () => {
    await request(server)
      .post('/needs/cccccccc-cccc-4ccc-8ccc-cccccccccccc/assign-manager')
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ organizationId: ORG_ID })
      .expect(404);
  });

  it('GET public/needs?category= filters by item category', async () => {
    // Create and validate a food need
    const foodRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Food filter test',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'medium',
        items: [{ name: 'Bread', quantity: 10, unit: null, category: 'food' }],
      })
      .expect(201);

    // Create and validate a medical need
    const medRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Medical filter test',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'high',
        items: [
          { name: 'Bandages', quantity: 50, unit: null, category: 'medical' },
        ],
      })
      .expect(201);

    const foodId = bodyId(foodRes);
    const medId = bodyId(medRes);

    await request(server)
      .post(`/needs/${foodId}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    await request(server)
      .post(`/needs/${medId}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // Filter by food
    const filtered = await request(server)
      .get(`/emergencies/${EM}/public/needs?category=food`)
      .expect(200);

    const ids: string[] = bodyList(filtered).map((n) => n.id);
    expect(ids).toContain(foodId);
    expect(ids).not.toContain(medId);
  });

  it('GET public/needs?priority= filters by priority', async () => {
    const urgentRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Urgent priority filter test',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'urgent',
        items: [
          { name: 'Water', quantity: 100, unit: 'liters', category: 'water' },
        ],
      })
      .expect(201);

    const urgentId = bodyId(urgentRes);

    await request(server)
      .post(`/needs/${urgentId}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    const filtered = await request(server)
      .get(`/emergencies/${EM}/public/needs?priority=urgent`)
      .expect(200);

    const filteredList = bodyList(filtered);
    const ids: string[] = filteredList.map((n) => n.id);
    expect(ids).toContain(urgentId);
    // All returned needs should be urgent
    const allUrgent = filteredList.every((n) => n.priority === 'urgent');
    expect(allUrgent).toBe(true);
  });

  it('GET needs/queue?category= filters pending needs by item category', async () => {
    const shelterRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Shelter queue filter test',
        location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'low',
        items: [
          { name: 'Tents', quantity: 5, unit: null, category: 'shelter' },
        ],
      })
      .expect(201);

    const shelterId = bodyId(shelterRes);

    const filtered = await request(server)
      .get(`/emergencies/${EM}/needs/queue?category=shelter`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const ids: string[] = bodyList(filtered).map((n) => n.id);
    expect(ids).toContain(shelterId);

    // Tools category should return no results for this need
    const filteredTools = await request(server)
      .get(`/emergencies/${EM}/needs/queue?category=tools`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const toolIds: string[] = bodyList(filteredTools).map((n) => n.id);
    expect(toolIds).not.toContain(shelterId);
  });

  it('invalid category value is silently ignored (returns all)', async () => {
    const all = await request(server)
      .get(`/emergencies/${EM}/public/needs`)
      .expect(200);

    const filtered = await request(server)
      .get(`/emergencies/${EM}/public/needs?category=notavalidcategory`)
      .expect(200);

    expect((filtered.body as unknown[]).length).toBe(
      (all.body as unknown[]).length,
    );
  });
});
