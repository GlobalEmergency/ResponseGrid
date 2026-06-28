/**
 * E2E: Service accounts & API keys (machine principals) — docs/features/13 §8
 *
 * Proves the full machine-principal lifecycle end-to-end:
 *   - an org_admin (JWT) creates a service account     POST   /service-accounts
 *   - a role is granted to that service account         (grants row, principal
 *                                                        type 'service_account')
 *   - the org_admin (JWT) issues a key, secret once     POST   /service-accounts/:id/api-keys
 *   - the key authenticates and introspects itself      GET    /service-accounts/me
 *       → principalId == the service account, and its grants are reflected
 *   - missing / malformed / unknown keys are rejected   401
 *   - a principal without apikey:create cannot create   403
 *   - the org_admin (JWT) revokes a key                 DELETE /api-keys/:keyId
 *   - the revoked key no longer authenticates           401
 *
 * The point: ApiKeyAuthGuard populates `request.user` in the same shape
 * JwtAuthGuard does, so a key authenticates exactly like a human principal.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  grantsTable,
  serviceAccountsTable,
  apiKeysTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// ── Unique UUIDs for this spec (avoid PK conflicts with other specs) ──────────
const ORG = 'a5000000-0000-4000-8000-0000000000a0';
const ADMIN_ID = 'a5000000-0000-4000-8000-0000000000a1';
const PLAIN_ID = 'a5000000-0000-4000-8000-0000000000a2';
const GRANT_ADMIN = 'a5000000-0000-4000-8000-0000000000a3';
const GRANT_SA = 'a5000000-0000-4000-8000-0000000000a4';

interface ServiceAccountIdentity {
  principalId: string;
  principalType: string;
  grants: Array<{ roleId: string; scopeType: string; scopeId: string | null }>;
}

describe('Service accounts & API keys (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let plainToken: string;
  let serviceAccountId: string;
  let liveKey: string;

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
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test',
    );
    try {
      // Clean slate — no other spec creates these, so a blanket delete is safe.
      // FK order: api_keys → service_accounts.
      await db.delete(apiKeysTable);
      await db.delete(serviceAccountsTable);

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'apikeys-admin@example.com',
            passwordHash: hash,
            name: 'API Keys Admin',
            isAdmin: false,
          },
          {
            id: PLAIN_ID,
            email: 'apikeys-plain@example.com',
            passwordHash: hash,
            name: 'API Keys Plain User',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // The admin holds org_admin in ORG — that role carries apikey:create and
      // apikey:revoke (docs/features/13 §4). isAdmin is false on purpose so the
      // test exercises the persisted org_admin grant, not a legacy admin escape.
      await db
        .insert(grantsTable)
        .values([
          {
            id: GRANT_ADMIN,
            principalId: ADMIN_ID,
            principalType: 'user',
            roleId: 'org_admin',
            scopeType: 'organization',
            scopeId: ORG,
            grantedAt: new Date(),
          },
        ])
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const [adminLogin, plainLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'apikeys-admin@example.com', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'apikeys-plain@example.com', password: 'Password1!' })
        .expect(200),
    ]);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;
    plainToken = (plainLogin.body as { accessToken: string }).accessToken;

    // org_admin creates a service account in their org.
    const saRes = await request(server)
      .post('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CI bot', ownerOrganizationId: ORG })
      .expect(201);
    serviceAccountId = (saRes.body as { id: string }).id;

    // Grant the service account a role so introspection has something to show.
    // A service-account principal is granted exactly like a user one.
    const saGrantDb = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test',
    );
    try {
      await saGrantDb.db
        .insert(grantsTable)
        .values([
          {
            id: GRANT_SA,
            principalId: serviceAccountId,
            principalType: 'service_account',
            roleId: 'org_member',
            scopeType: 'organization',
            scopeId: ORG,
            grantedAt: new Date(),
          },
        ])
        .onConflictDoNothing();
    } finally {
      await saGrantDb.pool.end();
    }

    // org_admin issues a key for the service account (secret shown once).
    const keyRes = await request(server)
      .post(`/service-accounts/${serviceAccountId}/api-keys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    const issued = keyRes.body as {
      id: string;
      apiKey: string;
      prefix: string;
    };
    expect(issued.apiKey.startsWith('rh_live_')).toBe(true);
    expect(issued.apiKey.startsWith(issued.prefix)).toBe(true);
    liveKey = issued.apiKey;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Management plane (JWT) ───────────────────────────────────────────────────

  describe('management (JWT-authenticated)', () => {
    it('a principal without apikey:create cannot create a service account → 403', async () => {
      await request(server)
        .post('/service-accounts')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'rogue bot', ownerOrganizationId: ORG })
        .expect(403);
    });

    it('creating a service account without a token → 401', async () => {
      await request(server)
        .post('/service-accounts')
        .send({ name: 'anon bot', ownerOrganizationId: ORG })
        .expect(401);
    });
  });

  // ── Authentication plane (X-API-Key) ─────────────────────────────────────────

  describe('GET /service-accounts/me (X-API-Key)', () => {
    it('a live key authenticates as its service account and reflects its grants → 200', async () => {
      const res = await request(server)
        .get('/service-accounts/me')
        .set('X-API-Key', liveKey)
        .expect(200);
      const body = res.body as ServiceAccountIdentity;
      expect(body.principalId).toBe(serviceAccountId);
      expect(body.principalType).toBe('service_account');
      const granted = body.grants.find((g) => g.roleId === 'org_member');
      expect(granted).toBeDefined();
      expect(granted?.scopeType).toBe('organization');
      expect(granted?.scopeId).toBe(ORG);
    });

    it('a missing key → 401', async () => {
      await request(server).get('/service-accounts/me').expect(401);
    });

    it('a malformed key → 401', async () => {
      await request(server)
        .get('/service-accounts/me')
        .set('X-API-Key', 'not-a-valid-key')
        .expect(401);
    });

    it('a well-formed but unknown key → 401', async () => {
      await request(server)
        .get('/service-accounts/me')
        .set('X-API-Key', `rh_live_${'0'.repeat(48)}`)
        .expect(401);
    });

    it('a JWT (Bearer) is not accepted on the key-only endpoint → 401', async () => {
      await request(server)
        .get('/service-accounts/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);
    });
  });

  // ── Revocation closes the loop ───────────────────────────────────────────────

  describe('revocation', () => {
    it('a revoked key stops authenticating → 401', async () => {
      // Issue a dedicated key so the steady-state liveKey tests are unaffected.
      const keyRes = await request(server)
        .post(`/service-accounts/${serviceAccountId}/api-keys`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);
      const { id: keyId, apiKey } = keyRes.body as {
        id: string;
        apiKey: string;
      };

      // It works before revocation.
      await request(server)
        .get('/service-accounts/me')
        .set('X-API-Key', apiKey)
        .expect(200);

      // org_admin revokes it.
      await request(server)
        .delete(`/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // It no longer authenticates.
      await request(server)
        .get('/service-accounts/me')
        .set('X-API-Key', apiKey)
        .expect(401);
    });

    it('revoking without apikey:revoke → 403', async () => {
      const keyRes = await request(server)
        .post(`/service-accounts/${serviceAccountId}/api-keys`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);
      const { id: keyId } = keyRes.body as { id: string };

      await request(server)
        .delete(`/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });
  });
});
