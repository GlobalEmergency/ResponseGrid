/**
 * E2E: permissions read endpoints (the data the permissions UI consumes)
 *
 * - GET /auth/me includes the user's grants
 * - GET /roles returns the fixed catalog (any authenticated user)
 * - GET /grants?principalId= is admin-only (403 for a normal user)
 * - GET /service-accounts is admin-only
 * - GET /groups/mine and GET /groups/:id work for a member
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
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { groupsTable } from '../src/contexts/groups/infrastructure/drizzle/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const ORG = 'c8000000-0000-4000-8000-0000000000c0';
const ADMIN_ID = 'c8000000-0000-4000-8000-0000000000c1';
const USER_ID = 'c8000000-0000-4000-8000-0000000000c2';
const GRANT_USER = 'c8000000-0000-4000-8000-0000000000c3';

interface MeBody {
  id: string;
  isAdmin: boolean;
  grants: Array<{ roleId: string; scopeType: string; scopeId: string | null }>;
}

describe('Permissions read endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let userToken: string;

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
      await db.delete(groupsTable);
      await db.delete(grantsTable).where(eq(grantsTable.scopeId, ORG));

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'admin-permsread@example.com',
            passwordHash: hash,
            name: 'Perms Admin',
            isAdmin: true,
          },
          {
            id: USER_ID,
            email: 'user-permsread@example.com',
            passwordHash: hash,
            name: 'Perms User',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(grantsTable)
        .values([
          {
            id: GRANT_USER,
            principalId: USER_ID,
            principalType: 'user',
            roleId: 'org_member',
            scopeType: 'organization',
            scopeId: ORG,
            grantedAt: new Date(),
          },
        ])
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const [adminLogin, userLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'admin-permsread@example.com', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'user-permsread@example.com', password: 'Password1!' })
        .expect(200),
    ]);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;
    userToken = (userLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/me returns the user’s grants', async () => {
    const res = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const body = res.body as MeBody;
    expect(body.id).toBe(USER_ID);
    expect(body.isAdmin).toBe(false);
    const orgMember = body.grants.find((g) => g.roleId === 'org_member');
    expect(orgMember).toBeDefined();
    expect(orgMember?.scopeType).toBe('organization');
    expect(orgMember?.scopeId).toBe(ORG);
  });

  it('GET /roles returns the catalog to any authenticated user', async () => {
    const res = await request(server)
      .get('/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const roles = res.body as Array<{ id: string; permissions: string[] }>;
    const orgAdmin = roles.find((r) => r.id === 'org_admin');
    expect(orgAdmin).toBeDefined();
    expect(orgAdmin?.permissions).toContain('apikey:create');
  });

  it('GET /grants is admin-only', async () => {
    await request(server)
      .get(`/grants?principalId=${USER_ID}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const res = await request(server)
      .get(`/grants?principalId=${USER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const grants = res.body as Array<{ roleId: string }>;
    expect(grants.some((g) => g.roleId === 'org_member')).toBe(true);
  });

  it('GET /service-accounts is admin-only', async () => {
    await request(server)
      .get('/service-accounts')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(server)
      .get('/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /groups/mine returns the caller’s memberships', async () => {
    // Admin creates a group (becomes a member via bootstrap manager grant).
    const created = await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Read-test group',
        visibility: 'public',
        ownerKind: 'organization',
        ownerId: ORG,
      })
      .expect(201);
    const groupId = (created.body as { id: string }).id;

    // A user self-joins, then sees it in /groups/mine as pending.
    await request(server)
      .post(`/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(204);

    const mine = await request(server)
      .get('/groups/mine')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const list = mine.body as Array<{ id: string; membershipStatus: string }>;
    const entry = list.find((g) => g.id === groupId);
    expect(entry?.membershipStatus).toBe('pending');

    // GET /groups/:id returns basic info to any authenticated user.
    const one = await request(server)
      .get(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect((one.body as { name: string }).name).toBe('Read-test group');
  });
});
