/**
 * E2E: Groups / cuadrillas (machine of managers) — docs/features/13 §6
 *
 * Proves the full lifecycle end-to-end:
 *   - an org_admin creates a group              POST   /groups        (becomes its manager)
 *   - a plain user cannot create one            POST   /groups        → 403
 *   - a user self-requests to join (public)     POST   /groups/:id/join
 *   - the manager lists + approves members      GET/POST /groups/:id/members…
 *   - the manager adds a user by email          POST   /groups/:id/members
 *   - the manager appoints a co-manager         POST   /groups/:id/managers
 *   - a bare member cannot read/manage          → 403
 *   - self-join on a private group is rejected  → 409
 *
 * Authorization rides on the same grants the rest of the platform uses: the
 * creator's bootstrap `group_manager` grant is loaded into the JWT on the next
 * request, so they can immediately manage.
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
import {
  groupsTable,
  groupMembersTable,
} from '../src/contexts/groups/infrastructure/drizzle/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const ORG = 'b7000000-0000-4000-8000-0000000000b0';
const ADMIN_ID = 'b7000000-0000-4000-8000-0000000000b1';
const ALICE_ID = 'b7000000-0000-4000-8000-0000000000b2';
const BOB_ID = 'b7000000-0000-4000-8000-0000000000b3';
const GRANT_ADMIN = 'b7000000-0000-4000-8000-0000000000b4';

interface MemberView {
  userId: string;
  status: string;
  addedByUserId: string | null;
}

describe('Groups (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let aliceToken: string;
  let bobToken: string;
  let groupId: string;

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
      await db.delete(groupMembersTable);
      await db.delete(groupsTable);
      // Clear any group-scoped grants from a prior run (e.g. bootstrap grants).
      await db.delete(grantsTable).where(eq(grantsTable.scopeType, 'group'));

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: ADMIN_ID,
            email: 'admin-groups@example.com',
            passwordHash: hash,
            name: 'Groups Admin',
            isAdmin: false,
          },
          {
            id: ALICE_ID,
            email: 'alice-groups@example.com',
            passwordHash: hash,
            name: 'Alice',
            isAdmin: false,
          },
          {
            id: BOB_ID,
            email: 'bob-groups@example.com',
            passwordHash: hash,
            name: 'Bob',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // org_admin in ORG carries group:create / group:manage_members.
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

    const [adminLogin, aliceLogin, bobLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'admin-groups@example.com', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'alice-groups@example.com', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'bob-groups@example.com', password: 'Password1!' })
        .expect(200),
    ]);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;
    aliceToken = (aliceLogin.body as { accessToken: string }).accessToken;
    bobToken = (bobLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('org_admin creates a public group → 201', async () => {
    const res = await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cuadrilla Valencia',
        visibility: 'public',
        ownerKind: 'organization',
        ownerId: ORG,
      })
      .expect(201);
    groupId = (res.body as { id: string }).id;
    expect(groupId).toBeDefined();
  });

  it('a plain user cannot create a group → 403', async () => {
    await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Rogue',
        visibility: 'public',
        ownerKind: 'organization',
        ownerId: ORG,
      })
      .expect(403);
  });

  it('unauthenticated create → 401', async () => {
    await request(server)
      .post('/groups')
      .send({
        name: 'Anon',
        visibility: 'public',
        ownerKind: 'organization',
        ownerId: ORG,
      })
      .expect(401);
  });

  it('a user self-requests to join the public group → 204 (pending)', async () => {
    await request(server)
      .post(`/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(204);

    const res = await request(server)
      .get(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const list = res.body as MemberView[];
    const alice = list.find((m) => m.userId === ALICE_ID);
    expect(alice?.status).toBe('pending');
  });

  it('the (bootstrapped) manager approves the pending member → 204', async () => {
    await request(server)
      .post(`/groups/${groupId}/members/${ALICE_ID}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const res = await request(server)
      .get(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const alice = (res.body as MemberView[]).find((m) => m.userId === ALICE_ID);
    expect(alice?.status).toBe('approved');
  });

  it('the manager adds a member by email (approved immediately) → 201', async () => {
    const res = await request(server)
      .post(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'bob-groups@example.com' })
      .expect(201);
    expect((res.body as MemberView).userId).toBe(BOB_ID);
    expect((res.body as MemberView).status).toBe('approved');
  });

  it('adding an unknown email → 404', async () => {
    await request(server)
      .post(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'ghost@example.com' })
      .expect(404);
  });

  it('the manager appoints a member as co-manager → 201', async () => {
    await request(server)
      .post(`/groups/${groupId}/managers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: ALICE_ID })
      .expect(201);

    // Alice now holds group_manager → she can read the member list.
    await request(server)
      .get(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
  });

  it('a bare member (no grant) cannot read the member list → 403', async () => {
    // Bob is an approved member but holds no group_manager grant.
    await request(server)
      .get(`/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403);
  });

  it('cannot appoint a non-member as manager → 404', async () => {
    await request(server)
      .post(`/groups/${groupId}/managers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
  });

  it('self-join on a private group is rejected → 409', async () => {
    const res = await request(server)
      .post('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Equipo privado',
        visibility: 'private',
        ownerKind: 'organization',
        ownerId: ORG,
      })
      .expect(201);
    const privateId = (res.body as { id: string }).id;

    await request(server)
      .post(`/groups/${privateId}/join`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(409);
  });
});
