/**
 * E2E: trusted-channel phone auth via a service-account API key (#315).
 *
 * A messaging bot (Telegram/WhatsApp) that already verified the user's phone
 * exchanges it for a user JWT — but ONLY when its Service Account holds the
 * dedicated `auth:trusted_phone_login` grant. Proves end to end:
 *   - no API key                                   → 401
 *   - API key WITHOUT the grant                     → 403
 *   - login: existing phone → 200 { accessToken, user }, and the token is a
 *       real user JWT (works on /auth/me); unknown phone → 404
 *   - register: new phone → 201, user persisted passwordless, consent stamped
 *       with the originating service account; existing email → 409; no consent → 400
 *   - the emitted JWT carries the USER's own isAdmin (no privilege escalation)
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  grantsTable,
  serviceAccountsTable,
  apiKeysTable,
  userConsentsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';

const ORG = '31500000-0000-4000-8000-0000000000b1';
const ADMIN_ID = '31500000-0000-4000-8000-0000000000a1';
const USER_ID = '31500000-0000-4000-8000-0000000000c1';
const GRANT_ADMIN = '31500000-0000-4000-8000-0000000000f1';
const GRANT_BOT = '31500000-0000-4000-8000-0000000000f2';

const USER_PHONE = '+58 412 555 0101';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

describe('Trusted-channel phone auth via API key (e2e, #315)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let botKey: string;
  let ungrantedKey: string;
  let botSaId: string;

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

    const { db, pool } = createDb(DB_URL);
    try {
      await db.delete(apiKeysTable);
      await db.delete(serviceAccountsTable);
      await db.delete(grantsTable).where(eq(grantsTable.id, GRANT_ADMIN));
      await db.delete(usersTable).where(eq(usersTable.id, ADMIN_ID));
      await db.delete(usersTable).where(eq(usersTable.id, USER_ID));

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'trusted-admin@example.com',
            passwordHash: hash,
            name: 'Trusted Admin',
            isAdmin: false,
          },
          {
            id: USER_ID,
            email: 'ana-trusted@example.com',
            passwordHash: hash,
            name: 'Ana Trusted',
            isAdmin: false,
            phone: USER_PHONE,
          },
        ])
        .onConflictDoNothing();

      // Admin administers ORG → apikey:create/revoke, so it can mint the bot's
      // service account and keys.
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
    } finally {
      await pool.end();
    }

    const adminLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'trusted-admin@example.com', password: 'Password1!' })
      .expect(200);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    // The bot's service account.
    const saRes = await request(server)
      .post('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'telegram-bot', ownerOrganizationId: ORG })
      .expect(201);
    botSaId = (saRes.body as { id: string }).id;

    // The dedicated platform-scoped trusted_channel_bot grant (the only thing
    // that unlocks the endpoints).
    const grantDb = createDb(DB_URL);
    try {
      await grantDb.db
        .insert(grantsTable)
        .values({
          id: GRANT_BOT,
          principalId: botSaId,
          principalType: 'service_account',
          roleId: 'trusted_channel_bot',
          scopeType: 'platform',
          scopeId: null,
          grantedAt: new Date(),
        })
        .onConflictDoNothing();
    } finally {
      await grantDb.pool.end();
    }

    const keyRes = await request(server)
      .post(`/service-accounts/${botSaId}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    botKey = (keyRes.body as { apiKey: string }).apiKey;

    // A second service account with NO trusted grant — proves the grant is required.
    const sa2 = await request(server)
      .post('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ungranted-bot', ownerOrganizationId: ORG })
      .expect(201);
    const key2 = await request(server)
      .post(`/service-accounts/${(sa2.body as { id: string }).id}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    ungrantedKey = (key2.body as { apiKey: string }).apiKey;
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

  describe('login-by-phone', () => {
    it('401 without an API key', async () => {
      await request(server)
        .post('/auth/trusted/login-by-phone')
        .send({ phone: USER_PHONE })
        .expect(401);
    });

    it('403 with an API key that lacks the trusted grant', async () => {
      await request(server)
        .post('/auth/trusted/login-by-phone')
        .set('X-API-Key', ungrantedKey)
        .send({ phone: USER_PHONE })
        .expect(403);
    });

    it('200 for an existing phone, and the token is a real user JWT', async () => {
      const res = await request(server)
        .post('/auth/trusted/login-by-phone')
        .set('X-API-Key', botKey)
        // A DIFFERENT format of the same number — normalisation must still match.
        .send({ phone: '+584125550101' })
        .expect(200);

      const body = res.body as {
        accessToken: string;
        user: { id: string; name: string; email: string };
      };
      expect(body.user).toEqual({
        id: USER_ID,
        name: 'Ana Trusted',
        email: 'ana-trusted@example.com',
      });

      // The token authenticates as that user on a normal JWT-guarded route.
      const me = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect((me.body as { id: string; isAdmin: boolean }).id).toBe(USER_ID);
      expect((me.body as { isAdmin: boolean }).isAdmin).toBe(false);
    });

    it('404 for a phone that belongs to no user', async () => {
      await request(server)
        .post('/auth/trusted/login-by-phone')
        .set('X-API-Key', botKey)
        .send({ phone: '+34600000000' })
        .expect(404);
    });
  });

  describe('register-by-phone', () => {
    it('201 creates a passwordless user and stamps consent with the service account', async () => {
      const res = await request(server)
        .post('/auth/trusted/register-by-phone')
        .set('X-API-Key', botKey)
        .send({
          phone: '+58 424 000 1122',
          name: 'Nuevo Usuario',
          email: 'nuevo-trusted@example.com',
          acceptedTerms: true,
          acceptedPrivacy: true,
        })
        .expect(201);

      const body = res.body as {
        accessToken: string;
        user: { id: string; email: string };
      };
      expect(body.user.email).toBe('nuevo-trusted@example.com');
      expect(body.accessToken).toBeTruthy();

      const { db, pool } = createDb(DB_URL);
      try {
        const consents = await db
          .select()
          .from(userConsentsTable)
          .where(eq(userConsentsTable.userId, body.user.id));
        expect(consents.length).toBe(2); // terms + privacy
        // Origin: the bot's service account, no browser ip/user-agent.
        for (const c of consents) {
          expect(c.serviceAccountId).toBe(botSaId);
          expect(c.ip).toBeNull();
        }
        const created = await db
          .select()
          .from(usersTable)
          .where(
            and(
              eq(usersTable.id, body.user.id),
              eq(usersTable.email, 'nuevo-trusted@example.com'),
            ),
          );
        expect(created[0]?.passwordHash).toBeNull(); // passwordless alta
        expect(created[0]?.phone).toBe('+58 424 000 1122');
      } finally {
        await pool.end();
      }
    });

    it('409 when the email already exists', async () => {
      await request(server)
        .post('/auth/trusted/register-by-phone')
        .set('X-API-Key', botKey)
        .send({
          phone: '+58 424 000 3344',
          name: 'Dup',
          email: 'ana-trusted@example.com', // already taken by the seeded user
          acceptedTerms: true,
          acceptedPrivacy: true,
        })
        .expect(409);
    });

    it('400 when consent is not accepted', async () => {
      await request(server)
        .post('/auth/trusted/register-by-phone')
        .set('X-API-Key', botKey)
        .send({
          phone: '+58 424 000 5566',
          name: 'Sin Consentimiento',
          email: 'sinconsent-trusted@example.com',
          acceptedTerms: false,
          acceptedPrivacy: true,
        })
        .expect(400);
    });

    it('403 with an API key that lacks the trusted grant', async () => {
      await request(server)
        .post('/auth/trusted/register-by-phone')
        .set('X-API-Key', ungrantedKey)
        .send({
          phone: '+58 424 000 7788',
          name: 'X',
          email: 'x-trusted@example.com',
          acceptedTerms: true,
          acceptedPrivacy: true,
        })
        .expect(403);
    });
  });
});
