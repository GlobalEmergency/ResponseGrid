import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { createDb } from '../src/shared/db';
import { usersTable } from '../src/contexts/identity/infrastructure/drizzle/schema';

const DB_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

/**
 * Admin global users console (#176). PII → strictly `user:read` at the platform
 * scope, which only `platform_admin` (isAdmin) holds. Mirrors the organizations
 * admin e2e: 401 (no token) / 403 (non-admin) / 200 (admin) / 404 (unknown id).
 */
describe('User admin console (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  const ADMIN_ID = 'a0000000-0000-4000-8000-0000000000c1';

  let adminToken: string;
  let citizenToken: string;
  let citizenId: string;

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

    // Seed a platform admin (isAdmin → platform_admin grant → holds user:read).
    // Additive (onConflictDoNothing) — other e2e files share this database.
    const { db, pool } = createDb(DB_URL);
    try {
      await db
        .insert(usersTable)
        .values({
          id: ADMIN_ID,
          email: 'usersadmin@reliefhub.org',
          passwordHash: await bcrypt.hash('admin1234', 10),
          name: 'Users Admin',
          isAdmin: true,
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const adminLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'usersadmin@reliefhub.org', password: 'admin1234' })
      .expect(200);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    // A plain citizen (no user:read at the platform scope).
    const citizenReg = await request(server)
      .post('/auth/register')
      .send({
        email: 'plainuser@reliefhub.org',
        password: 'password123',
        name: 'Plain User',
      })
      .expect(201);
    citizenToken = (citizenReg.body as { accessToken: string }).accessToken;

    const me = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);
    citizenId = (me.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users (list)', () => {
    it('returns 401 without a token', async () => {
      await request(server).get('/users').expect(401);
    });

    it('returns 403 for a non-privileged user', async () => {
      await request(server)
        .get('/users')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('returns the enriched global list for an admin', async () => {
      const res = await request(server)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = res.body as Array<{
        id: string;
        email: string;
        roles: string[];
        grantCount: number;
        createdAt: string;
      }>;
      expect(Array.isArray(users)).toBe(true);
      const admin = users.find((u) => u.id === ADMIN_ID);
      expect(admin).toBeDefined();
      expect(admin?.email).toBe('usersadmin@reliefhub.org');
      expect(typeof admin?.createdAt).toBe('string');
      // the admin logged in above → lastLoginAt is set
      const citizen = users.find((u) => u.id === citizenId);
      expect(citizen).toBeDefined();
    });
  });

  describe('GET /users/:id (detail)', () => {
    it('returns 401 without a token', async () => {
      await request(server).get(`/users/${citizenId}`).expect(401);
    });

    it('returns 403 for a non-privileged user', async () => {
      await request(server)
        .get(`/users/${citizenId}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('returns full detail for an admin', async () => {
      const res = await request(server)
        .get(`/users/${ADMIN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const detail = res.body as {
        id: string;
        email: string;
        lastLoginAt: string | null;
        grants: unknown[];
        organizations: unknown[];
        activity: unknown[];
      };
      expect(detail.id).toBe(ADMIN_ID);
      expect(detail.email).toBe('usersadmin@reliefhub.org');
      expect(detail.lastLoginAt).not.toBeNull();
      expect(Array.isArray(detail.grants)).toBe(true);
      expect(Array.isArray(detail.organizations)).toBe(true);
      expect(Array.isArray(detail.activity)).toBe(true);
    });

    it('returns 404 for an unknown user id', async () => {
      await request(server)
        .get('/users/00000000-0000-4000-8000-0000000000ff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 400 for a non-UUID id', async () => {
      await request(server)
        .get('/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
