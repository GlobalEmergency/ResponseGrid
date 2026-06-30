/**
 * E2E: delegated "author" writes via a service-account API key (issue #235).
 *
 * Proves the integration story end-to-end on the needs write path (the offers
 * and resources writes share the exact same JwtOrApiKeyAuthGuard +
 * ServiceAccountPermissionGuard + author plumbing):
 *
 *   - a trusted integration's API key + `integration_partner` grant + `author`
 *       → 201, the need is created pending, attributed to the real person
 *   - the same key WITHOUT `author`                       → 400 (author is the unlock)
 *   - an API key WITHOUT the create grant                 → 403
 *   - no credentials at all                               → 401
 *   - a human JWT user still creates without author       → 201 (unchanged)
 *   - `author` is RESTRICTED: it shows on the coordinator queue but NEVER on the
 *       public feed
 */
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
  grantsTable,
  serviceAccountsTable,
  apiKeysTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const EM = 'a7000000-0000-4000-8000-0000000000e1';
const ORG = 'a7000000-0000-4000-8000-0000000000b1';
const ADMIN_ID = 'a7000000-0000-4000-8000-0000000000a1';
const COORD_ID = 'a7000000-0000-4000-8000-0000000000c1';
const MEMBERSHIP_ID = 'a7000000-0000-4000-8000-0000000000d1';
const GRANT_ADMIN = 'a7000000-0000-4000-8000-0000000000f1';
const GRANT_SA = 'a7000000-0000-4000-8000-0000000000f2';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

const author = {
  name: 'María P.',
  email: 'maria@example.com',
  phone: '+58 412 1234567',
  note: 'Llamar por la tarde',
  source: 'terremotovenezuela.app',
};

function needBody(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: 'Agua para 30 familias',
    location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
    priority: 'high',
    items: [{ name: 'Agua', quantity: 100, unit: 'litros', category: 'water' }],
    ...extra,
  };
}

describe('Author delegated writes via API key (e2e, #235)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let adminToken: string;
  let serviceAccountId: string;
  let grantedKey: string;
  let ungrantedKey: string;

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
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(DB_URL);
    try {
      await db.delete(needItemsTable);
      await db.delete(needsTable);

      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Author Flow Emergency',
          slug: 'author-flow-emergency',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'author-admin@example.com',
            passwordHash: hash,
            name: 'Author Admin',
            isAdmin: false,
          },
          {
            id: COORD_ID,
            email: 'author-coord@example.com',
            passwordHash: hash,
            name: 'Author Coordinator',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // Admin administers ORG (org_admin → apikey:create/revoke); coordinator
      // coordinates EM (so it can read the queue and validate).
      await db
        .insert(grantsTable)
        .values({
          id: GRANT_ADMIN,
          principalId: ADMIN_ID,
          principalType: 'user',
          roleId: 'org_admin',
          scopeType: 'organization',
          scopeId: ORG,
          grantedAt: new Date(),
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

    const [adminLogin, coordLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'author-admin@example.com', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'author-coord@example.com', password: 'Password1!' })
        .expect(200),
    ]);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;

    // The org_admin creates the integration's service account and two keys.
    const saRes = await request(server)
      .post('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'terremotovenezuela.app', ownerOrganizationId: ORG })
      .expect(201);
    serviceAccountId = (saRes.body as { id: string }).id;

    // Grant the SA `integration_partner` AT the emergency scope — it can now
    // need:create / offer:create / resource:register there (and nothing else).
    const grantDb = createDb(DB_URL);
    try {
      await grantDb.db
        .insert(grantsTable)
        .values({
          id: GRANT_SA,
          principalId: serviceAccountId,
          principalType: 'service_account',
          roleId: 'integration_partner',
          scopeType: 'emergency',
          scopeId: EM,
          grantedAt: new Date(),
        })
        .onConflictDoNothing();
    } finally {
      await grantDb.pool.end();
    }

    const grantedRes = await request(server)
      .post(`/service-accounts/${serviceAccountId}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    grantedKey = (grantedRes.body as { apiKey: string }).apiKey;

    // A second service account with NO grant — to prove the grant is required.
    const sa2Res = await request(server)
      .post('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ungranted bot', ownerOrganizationId: ORG })
      .expect(201);
    const ungrantedRes = await request(server)
      .post(`/service-accounts/${(sa2Res.body as { id: string }).id}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    ungrantedKey = (ungrantedRes.body as { apiKey: string }).apiKey;
  });

  afterAll(async () => {
    const { db, pool } = createDb(DB_URL);
    try {
      await db.delete(apiKeysTable);
      await db.delete(serviceAccountsTable);
    } finally {
      await pool.end();
    }
    await app.close();
  });

  it('no credentials → 401', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .send(needBody({ author }))
      .expect(401);
  });

  it('API key WITHOUT the create grant → 403', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('X-API-Key', ungrantedKey)
      .send(needBody({ author }))
      .expect(403);
  });

  it('API key WITH grant but WITHOUT author → 400 (author is the unlock)', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('X-API-Key', grantedKey)
      .send(needBody())
      .expect(400);
  });

  it('API key + grant + author → 201, and author shows on the coordinator queue but NOT publicly', async () => {
    const created = await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('X-API-Key', grantedKey)
      .send(needBody({ author }))
      .expect(201);
    const id = (created.body as { id: string }).id;

    // Coordinator queue: the pending need carries the restricted author block.
    const queue = await request(server)
      .get(`/emergencies/${EM}/needs/queue`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);
    const queued = (
      queue.body as Array<{
        id: string;
        author: typeof author & { verified: boolean };
      }>
    ).find((n) => n.id === id);
    expect(queued).toBeDefined();
    expect(queued!.author).toMatchObject({
      name: 'María P.',
      email: 'maria@example.com',
      phone: '+58 412 1234567',
      source: 'terremotovenezuela.app',
      // self-reported, unverified by default
      verified: false,
    });

    // Validate it so it reaches the public feed.
    await request(server)
      .post(`/needs/${id}/validate`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // Public feed: the need is present but its author/contact is NEVER exposed.
    const publicRes = await request(server)
      .get(`/emergencies/${EM}/public/needs`)
      .expect(200);
    const publicNeed = (publicRes.body as Array<{ id: string }>).find(
      (n) => n.id === id,
    );
    expect(publicNeed).toBeDefined();
    expect(publicNeed).not.toHaveProperty('author');
    expect(JSON.stringify(publicNeed)).not.toContain('maria@example.com');
  });

  it('a human JWT user still creates a need without author → 201 (unchanged flow)', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send(needBody())
      .expect(201);
  });

  it('rejects a malformed author email → 400', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('X-API-Key', grantedKey)
      .send(needBody({ author: { name: 'X', email: 'not-an-email' } }))
      .expect(400);
  });

  it('rejects an author with no contact fields → 400', async () => {
    await request(server)
      .post(`/emergencies/${EM}/needs`)
      .set('X-API-Key', grantedKey)
      .send(needBody({ author: { verified: true, source: 'test-app' } }))
      .expect(400);
  });
});
