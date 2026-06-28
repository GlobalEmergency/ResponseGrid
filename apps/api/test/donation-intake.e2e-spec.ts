/**
 * E2E: donation intake pre-registration flow (#15, phase 2).
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttpApp } from '../src/shared/configure-http-app';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import {
  donationIntakeLinesTable,
  donationIntakesTable,
} from '../src/contexts/offers/infrastructure/drizzle/donation-intake-schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = '66666666-6666-4666-8666-666666666661';
const PAUSED_EM = '66666666-6666-4666-8666-666666666662';
const RESOURCE = '77777777-7777-4777-8777-777777777771';
const COORD_ID = '88888888-8888-4888-8888-888888888881';
const MEMBERSHIP_ID = '99999999-9999-4999-8999-999999999991';

const baseItem = {
  category: 'food',
  name: 'Arroz 1kg',
  quantity: 10,
  unit: 'bolsas',
};

const baseIntakeBody = {
  targetResourceId: RESOURCE,
  donorName: 'María López',
  donorPhone: '+52 55 1234 5678',
  items: [baseItem],
};

describe('Donation intake flow (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureHttpApp(app);
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(donationIntakeLinesTable);
      await db.delete(donationIntakesTable);
      await db.delete(resourcesTable);

      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM,
            name: 'Intake E2E Emergency',
            slug: 'intake-e2e-emergency',
            country: 'VE',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: PAUSED_EM,
            name: 'Intake Paused Emergency',
            slug: 'intake-paused-emergency',
            country: 'VE',
            status: 'paused',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      const hash = await bcrypt.hash('coord1234', 10);
      await db.insert(usersTable).values({
        id: COORD_ID,
        email: 'coord-intake@reliefhub.org',
        passwordHash: hash,
        name: 'Intake Coordinator',
        isAdmin: false,
      });
      await db.insert(membershipsTable).values({
        id: MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM,
        role: 'coordinator',
      });

      await db.insert(resourcesTable).values({
        id: RESOURCE,
        emergencyId: EM,
        type: 'collection_point',
        stage: 'origin',
        name: 'Acopio E2E',
        address: 'Av. Test, Caracas',
        latitude: 10.4806,
        longitude: -66.9036,
        ownerUserId: COORD_ID,
        verificationLevel: 'verified',
        publicStatus: 'active',
        createdAt: new Date(),
      });
    } finally {
      await pool.end();
    }

    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'coord-intake@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a public intake and returns ACO code', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send(baseIntakeBody)
      .expect(201);

    const body = res.body as {
      id: string;
      intakeCode: string;
      status: string;
    };
    expect(body.intakeCode).toMatch(/^ACO-[A-Z2-9]{4}$/);
    expect(body.status).toBe('pending');
    expect(typeof body.id).toBe('string');
  });

  it('rejects intake when emergency is paused', async () => {
    await request(server)
      .post(`/emergencies/${PAUSED_EM}/donation-intakes`)
      .send(baseIntakeBody)
      .expect(409);
  });

  it('rejects intake when collection point is invalid', async () => {
    await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send({
        ...baseIntakeBody,
        targetResourceId: '00000000-0000-4000-8000-000000000099',
      })
      .expect(422);
  });

  it('lookup-contact recognizes returning donor', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM}/donation-intakes/lookup-contact`)
      .send({ donorPhone: '+52 55 1234 5678' })
      .expect(200);

    const body = res.body as {
      donorName: string | null;
      pendingIntakes: Array<{ intakeCode: string; itemCount: number }>;
    };
    expect(body.donorName).toBe('María López');
    expect(body.pendingIntakes.length).toBeGreaterThanOrEqual(1);
    expect(body.pendingIntakes[0]?.itemCount).toBe(1);
  });

  it('volunteer searches, views detail, receives intake', async () => {
    const created = await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send({
        ...baseIntakeBody,
        donorName: 'Pedro Recepción',
        donorPhone: '+58 412 000 1111',
      })
      .expect(201);
    const { id, intakeCode } = created.body as {
      id: string;
      intakeCode: string;
    };

    await request(server)
      .get(`/emergencies/${EM}/donation-intakes/search`)
      .query({ q: intakeCode })
      .expect(401);

    const search = await request(server)
      .get(`/emergencies/${EM}/donation-intakes/search`)
      .set('Authorization', `Bearer ${coordToken}`)
      .query({ q: 'Pedro' })
      .expect(200);
    const hits = search.body as Array<{ id: string; intakeCode: string }>;
    expect(hits.some((h) => h.id === id)).toBe(true);

    const detail = await request(server)
      .get(`/donation-intakes/${id}`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    const view = detail.body as {
      intakeCode: string;
      lines: Array<{ name: string }>;
    };
    expect(view.intakeCode).toBe(intakeCode);
    expect(view.lines[0]?.name).toBe('Arroz 1kg');

    const pending = await request(server)
      .get(`/resources/${RESOURCE}/donation-intakes/pending`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    const queue = pending.body as Array<{ id: string }>;
    expect(queue.some((row) => row.id === id)).toBe(true);

    await request(server)
      .post(`/donation-intakes/${id}/receive`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ volunteerNotes: 'Todo correcto' })
      .expect(204);

    const after = await request(server)
      .get(`/donation-intakes/${id}`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect((after.body as { status: string }).status).toBe('received');
  });

  it('donor updates pending intake with matching code and contact', async () => {
    const created = await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send({
        ...baseIntakeBody,
        donorName: 'Ana Edición',
        donorEmail: 'ana.edit@example.com',
        donorPhone: null,
      })
      .expect(201);
    const { id, intakeCode } = created.body as {
      id: string;
      intakeCode: string;
    };

    await request(server)
      .patch(`/donation-intakes/${id}`)
      .send({
        intakeCode,
        donorName: 'Ana Actualizada',
        donorEmail: 'ana.edit@example.com',
        items: [{ ...baseItem, quantity: 20 }],
      })
      .expect(200);

    await request(server)
      .patch(`/donation-intakes/${id}`)
      .send({
        intakeCode,
        donorName: 'Ana Actualizada',
        donorEmail: 'wrong@example.com',
        items: [baseItem],
      })
      .expect(403);
  });

  it('volunteer can reject and mark incomplete on pending intakes', async () => {
    const rejectTarget = await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send({
        ...baseIntakeBody,
        donorName: 'Rechazado',
        donorPhone: '+58 412 000 2222',
      })
      .expect(201);
    const rejectId = (rejectTarget.body as { id: string }).id;

    await request(server)
      .post(`/donation-intakes/${rejectId}/reject`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ volunteerNotes: 'Artículos no permitidos' })
      .expect(204);

    const incompleteTarget = await request(server)
      .post(`/emergencies/${EM}/donation-intakes`)
      .send({
        ...baseIntakeBody,
        donorName: 'Incompleto',
        donorPhone: '+58 412 000 3333',
      })
      .expect(201);
    const incompleteId = (incompleteTarget.body as { id: string }).id;

    await request(server)
      .post(`/donation-intakes/${incompleteId}/incomplete`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ volunteerNotes: 'Faltan bolsas' })
      .expect(204);
  });

  it('returns intake deep link for a published collection point', async () => {
    const res = await request(server)
      .get(`/resources/${RESOURCE}/intake-link`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const body = res.body as {
      url: string;
      resourceName: string;
      slug: string;
      resourceId: string;
    };
    expect(body.resourceName).toBe('Acopio E2E');
    expect(body.slug).toBe('intake-e2e-emergency');
    expect(body.resourceId).toBe(RESOURCE);
    expect(body.url).toBe(
      `http://localhost:3001/e/intake-e2e-emergency/donar-acopio?resourceId=${RESOURCE}`,
    );
  });

  it('returns PNG QR for intake deep link', async () => {
    const res = await request(server)
      .get(`/resources/${RESOURCE}/intake-qr`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect((res.body as Buffer).length).toBeGreaterThan(100);
  });

  it('returns 404 for intake link on unknown resource', async () => {
    await request(server)
      .get(`/resources/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/intake-link`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(404);
  });
});
