import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import {
  resourcesTable,
  resourceValidityReportsTable,
} from '../src/contexts/resources/infrastructure/drizzle/schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = '11111111-1111-4111-8111-111111111111';

// UUIDs scoped to this spec (bb… prefix) to avoid clashes with other e2e files.
const OWNER_ID = 'bb100000-0000-4000-8000-000000000001';
const COORD_ID = 'bb200000-0000-4000-8000-000000000002';
const CIT1_ID = 'bb300000-0000-4000-8000-000000000003';
const CIT2_ID = 'bb400000-0000-4000-8000-000000000004';
const CIT3_ID = 'bb500000-0000-4000-8000-000000000005';
const COORD_MEMBERSHIP_ID = 'bb600000-0000-4000-8000-000000000006';
const ALL_USERS = [OWNER_ID, COORD_ID, CIT1_ID, CIT2_ID, CIT3_ID];

const baseLocation = {
  address: 'Av. del Puerto 22, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

type Tokens = Record<string, string>;

describe('Resource validity reports (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  const tok: Tokens = {};

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
      await db
        .delete(membershipsTable)
        .where(inArray(membershipsTable.userId, ALL_USERS));
      await db.delete(usersTable).where(inArray(usersTable.id, ALL_USERS));

      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Validity Emergency',
          slug: 'validity-emergency',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const hash = await bcrypt.hash('pass1234', 10);
      await db.insert(usersTable).values(
        ALL_USERS.map((id, i) => ({
          id,
          email: `validity-${i}@reliefhub.org`,
          passwordHash: hash,
          name: `User ${i}`,
          isAdmin: false,
        })),
      );

      await db.insert(membershipsTable).values({
        id: COORD_MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM,
        role: 'coordinator',
      });
    } finally {
      await pool.end();
    }

    const logins = await Promise.all(
      ALL_USERS.map((_, i) =>
        request(server)
          .post('/auth/login')
          .send({ email: `validity-${i}@reliefhub.org`, password: 'pass1234' })
          .expect(200),
      ),
    );
    [OWNER_ID, COORD_ID, CIT1_ID, CIT2_ID, CIT3_ID].forEach((id, i) => {
      tok[id] = (logins[i].body as { accessToken: string }).accessToken;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPublishedResource(name: string): Promise<string> {
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${tok[OWNER_ID]}`)
      .send({
        type: 'warehouse',
        stage: 'origin',
        name,
        location: baseLocation,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;
    await request(server)
      .post(`/resources/${id}/verify`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .send({})
      .expect(204);
    await request(server)
      .post(`/resources/${id}/publish`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .expect(204);
    return id;
  }

  function report(id: string, userId: string, reason = 'closed') {
    return request(server)
      .post(`/resources/${id}/validity-reports`)
      .set('Authorization', `Bearer ${tok[userId]}`)
      .send({ reason });
  }

  it('flags the resource disputed after 3 distinct citizens report it; it stays visible', async () => {
    const id = await createPublishedResource('Punto en duda');

    const first = await report(id, CIT1_ID).expect(201);
    expect((first.body as { disputed: boolean }).disputed).toBe(false);
    await report(id, CIT2_ID, 'moved').expect(201);
    const third = await report(id, CIT3_ID).expect(201);
    expect((third.body as { disputed: boolean }).disputed).toBe(true);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as {
        items: Array<{ id: string; publicStatus: string; disputed: boolean }>;
      }
    ).items.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.publicStatus).toBe('active'); // still visible
    expect(found?.disputed).toBe(true);
  });

  it('blocks the owner from reporting their own resource (403)', async () => {
    const id = await createPublishedResource('Punto propio');
    await report(id, OWNER_ID).expect(403);
  });

  it('rejects reports without a token (401)', async () => {
    const id = await createPublishedResource('Punto sin auth');
    await request(server)
      .post(`/resources/${id}/validity-reports`)
      .send({ reason: 'closed' })
      .expect(401);
  });

  it('coordinator sees the disputed queue with a reason breakdown', async () => {
    const id = await createPublishedResource('Punto cola');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID, 'moved').expect(201);

    const res = await request(server)
      .get(`/emergencies/${EM}/coordination/disputed`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .expect(200);
    const entry = (
      res.body as Array<{
        resource: { id: string };
        distinctReporters: number;
        byReason: Record<string, number>;
      }>
    ).find((d) => d.resource.id === id);
    expect(entry).toBeDefined();
    expect(entry?.distinctReporters).toBe(3);
    expect(entry?.byReason).toEqual({ closed: 2, moved: 1 });
  });

  it('ignores expired reports in the disputed queue', async () => {
    const id = await createPublishedResource('Punto caducado');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID).expect(201);

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db
        .update(resourceValidityReportsTable)
        .set({
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        })
        .where(inArray(resourceValidityReportsTable.resourceId, [id]));
    } finally {
      await pool.end();
    }

    const res = await request(server)
      .get(`/emergencies/${EM}/coordination/disputed`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .expect(200);
    const entry = (res.body as Array<{ resource: { id: string } }>).find(
      (d) => d.resource.id === id,
    );
    expect(entry).toBeUndefined();
  });

  it('a non-coordinator cannot read the disputed queue or resolve (403)', async () => {
    const id = await createPublishedResource('Punto authz');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID).expect(201);

    await request(server)
      .get(`/emergencies/${EM}/coordination/disputed`)
      .set('Authorization', `Bearer ${tok[CIT1_ID]}`)
      .expect(403);
    await request(server)
      .post(`/resources/${id}/dispute/resolve`)
      .set('Authorization', `Bearer ${tok[CIT1_ID]}`)
      .send({ resolution: 'dismiss', reason: 'no procede' })
      .expect(403);
  });

  it('resolve requires a reason (400)', async () => {
    const id = await createPublishedResource('Punto sin motivo');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID).expect(201);

    await request(server)
      .post(`/resources/${id}/dispute/resolve`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .send({ resolution: 'confirm_closed' })
      .expect(400);
  });

  it('coordinator confirm_closed: point closes, leaves public list and the disputed queue', async () => {
    const id = await createPublishedResource('Punto a cerrar');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID).expect(201);

    // Coordinator can see the individual reports before resolving
    const reports = await request(server)
      .get(`/resources/${id}/validity-reports`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .expect(200);
    expect((reports.body as unknown[]).length).toBe(3);

    await request(server)
      .post(`/resources/${id}/dispute/resolve`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .send({
        resolution: 'confirm_closed',
        reason: 'Confirmado: el punto cerró',
      })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string }> }
    ).items.find((r) => r.id === id);
    expect(found).toBeUndefined(); // closed → not visible

    const disputed = await request(server)
      .get(`/emergencies/${EM}/coordination/disputed`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .expect(200);
    const stillThere = (
      disputed.body as Array<{ resource: { id: string } }>
    ).find((d) => d.resource.id === id);
    expect(stillThere).toBeUndefined();
  });

  it('dismiss keeps the point active and clears the dispute', async () => {
    const id = await createPublishedResource('Punto a descartar');
    await report(id, CIT1_ID).expect(201);
    await report(id, CIT2_ID).expect(201);
    await report(id, CIT3_ID).expect(201);

    await request(server)
      .post(`/resources/${id}/dispute/resolve`)
      .set('Authorization', `Bearer ${tok[COORD_ID]}`)
      .send({ resolution: 'dismiss', reason: 'Verificado: sigue abierto' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as {
        items: Array<{ id: string; publicStatus: string; disputed: boolean }>;
      }
    ).items.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.publicStatus).toBe('active');
    expect(found?.disputed).toBe(false);
  });
});
