import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { OffersDomainExceptionFilter } from '../src/contexts/offers/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { offersTable } from '../src/contexts/offers/infrastructure/drizzle/schema';
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

const EM = 'aaaaaaaa-0001-4001-8001-000000000001';
const PAUSED_EM = 'aaaaaaaa-0002-4002-8002-000000000002';
const COORD_ID = 'bbbbbbbb-0001-4001-8001-000000000001';
const DONOR_ID = 'bbbbbbbb-0002-4002-8002-000000000002';
const MEMBERSHIP_ID = 'cccccccc-0001-4001-8001-000000000001';

function bodyId(res: { body: unknown }): string {
  return (res.body as { id: string }).id;
}

const baseOfferBody = {
  category: 'food',
  description: 'Rice bags 25kg',
  quantity: 50,
  unit: 'bags',
  location: {
    address: 'Av. Libertador, Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  },
};

describe('Offer matching flow (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let donorToken: string;

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
      new OffersDomainExceptionFilter(),
    );
    await app.init();

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(offersTable);
      await db.delete(needItemsTable);
      await db.delete(needsTable);

      // Seed emergencies
      await db
        .insert(emergenciesTable)
        .values([
          {
            id: EM,
            name: 'Offer Matching Emergency',
            slug: 'offer-matching-emergency',
            country: 'VE',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: PAUSED_EM,
            name: 'Paused Emergency',
            slug: 'paused-emergency',
            country: 'VE',
            status: 'paused',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Seed users
      await db
        .insert(usersTable)
        .values([
          {
            id: COORD_ID,
            email: 'coord-offers@reliefhub.org',
            passwordHash: await bcrypt.hash('coord1234', 10),
            name: 'Offers Coordinator',
            isAdmin: false,
          },
          {
            id: DONOR_ID,
            email: 'donor-offers@reliefhub.org',
            passwordHash: await bcrypt.hash('donor1234', 10),
            name: 'Offers Donor',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // Coordinator membership
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

    const coordLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'coord-offers@reliefhub.org', password: 'coord1234' })
      .expect(200);
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;

    const donorLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'donor-offers@reliefhub.org', password: 'donor1234' })
      .expect(200);
    donorToken = (donorLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST offer without token → 401', async () => {
    await request(server)
      .post(`/emergencies/${EM}/offers`)
      .send(baseOfferBody)
      .expect(401);
  });

  it('POST offer to paused emergency → 409', async () => {
    await request(server)
      .post(`/emergencies/${PAUSED_EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send(baseOfferBody)
      .expect(409);
  });

  it('full flow: submit → queue → match → fulfill', async () => {
    // 1. Donor submits general offer (Open)
    const created = await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send(baseOfferBody)
      .expect(201);

    const offerId = bodyId(created);
    expect(offerId).toBeDefined();

    // 2. Coordinator sees it in queue
    const queue = await request(server)
      .get(`/emergencies/${EM}/offers/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const inQueue = (queue.body as Array<{ id: string; status: string }>).find(
      (o) => o.id === offerId,
    );
    expect(inQueue).toBeDefined();
    expect(inQueue?.status).toBe('open');

    // 3. Non-coordinator (donor) cannot access queue → 403
    await request(server)
      .get(`/emergencies/${EM}/offers/queue`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(403);

    // 4. Donor checks own offers
    const mine = await request(server)
      .get(`/emergencies/${EM}/offers/mine`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(200);

    expect(
      (mine.body as Array<{ id: string }>).find((o) => o.id === offerId),
    ).toBeDefined();

    // 5. Create a validated need to match against
    const needCreated = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Food for families',
        location: {
          address: 'Plaza Caracas',
          latitude: 10.48,
          longitude: -66.9,
        },
        priority: 'high',
        items: [{ name: 'Rice', quantity: 100, unit: 'kg', category: 'food' }],
      })
      .expect(201);
    const needId = bodyId(needCreated);

    await request(server)
      .post(`/needs/${needId}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // 6. Non-coordinator cannot match → 403
    await request(server)
      .post(`/offers/${offerId}/match`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ needId })
      .expect(403);

    // 7. Coordinator matches offer to need → 204
    await request(server)
      .post(`/offers/${offerId}/match`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ needId })
      .expect(204);

    // 8. Offer no longer in open queue
    const queueAfter = await request(server)
      .get(`/emergencies/${EM}/offers/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    expect(
      (queueAfter.body as Array<{ id: string }>).find(
        (o) => o.id === offerId,
      ),
    ).toBeUndefined();

    // 9. Offer appears in need's matched list
    const needOffers = await request(server)
      .get(`/needs/${needId}/offers`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    const matched = (
      needOffers.body as Array<{ id: string; status: string }>
    ).find((o) => o.id === offerId);
    expect(matched).toBeDefined();
    expect(matched?.status).toBe('matched');

    // 10. Coordinator fulfills → 204
    await request(server)
      .post(`/offers/${offerId}/fulfill`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // 11. Mine still shows the offer (now fulfilled)
    const mineAfter = await request(server)
      .get(`/emergencies/${EM}/offers/mine`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(200);
    const fulfilled = (
      mineAfter.body as Array<{ id: string; status: string }>
    ).find((o) => o.id === offerId);
    expect(fulfilled).toBeDefined();
    expect(fulfilled?.status).toBe('fulfilled');
  });

  it('directed offer: submit with targetNeedId → appears as Open in queue', async () => {
    // Create a need first
    const needRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Water need',
        location: { address: 'East Caracas', latitude: 10.49, longitude: -66.88 },
        priority: 'medium',
        items: [{ name: 'Water', quantity: 50, unit: 'liters', category: 'water' }],
      })
      .expect(201);
    const needId = bodyId(needRes);

    const offerRes = await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...baseOfferBody, targetNeedId: needId })
      .expect(201);

    const offerId = bodyId(offerRes);
    const queue = await request(server)
      .get(`/emergencies/${EM}/offers/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const inQueue = (queue.body as Array<{ id: string; status: string; targetNeedId: string | null }>).find(
      (o) => o.id === offerId,
    );
    expect(inQueue).toBeDefined();
    expect(inQueue?.status).toBe('open');
    expect(inQueue?.targetNeedId).toBe(needId);
  });

  it('suggest returns only offers of the same category', async () => {
    // Create a food need
    const needRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Food need for suggest test',
        location: { address: 'West Caracas', latitude: 10.47, longitude: -66.92 },
        priority: 'high',
        items: [{ name: 'Rice', quantity: 20, unit: 'kg', category: 'food' }],
      })
      .expect(201);
    const needId = bodyId(needRes);

    // Submit a food offer (should appear) and a water offer (should NOT appear)
    const foodOfferRes = await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...baseOfferBody, description: 'Food for suggest', category: 'food' })
      .expect(201);
    const foodOfferId = bodyId(foodOfferRes);

    await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...baseOfferBody, description: 'Water for suggest', category: 'water' })
      .expect(201);

    const suggestRes = await request(server)
      .get(`/needs/${needId}/offer-suggestions`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const suggestions = suggestRes.body as Array<{ id: string; category: string }>;
    expect(suggestions.find((o) => o.id === foodOfferId)).toBeDefined();
    expect(suggestions.every((o) => o.category === 'food')).toBe(true);
  });

  it('cancel by owner → 204; cancel already fulfilled → 409', async () => {
    // Submit and cancel as donor
    const offerRes = await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...baseOfferBody, description: 'To be cancelled' })
      .expect(201);
    const offerId = bodyId(offerRes);

    await request(server)
      .post(`/offers/${offerId}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(204);

    // Submit, match, fulfill, then try to cancel → 409
    const offerRes2 = await request(server)
      .post(`/emergencies/${EM}/offers`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...baseOfferBody, description: 'Already fulfilled' })
      .expect(201);
    const offerId2 = bodyId(offerRes2);

    // Need for matching
    const needRes = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        title: 'Need for cancel test',
        location: { address: 'Central Caracas', latitude: 10.48, longitude: -66.9 },
        priority: 'low',
        items: [{ name: 'Rice', quantity: 10, unit: 'kg', category: 'food' }],
      })
      .expect(201);
    const needId = bodyId(needRes);
    await request(server)
      .post(`/needs/${needId}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    await request(server)
      .post(`/offers/${offerId2}/match`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ needId })
      .expect(204);
    await request(server)
      .post(`/offers/${offerId2}/fulfill`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);
    await request(server)
      .post(`/offers/${offerId2}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .expect(409);
  });
});
