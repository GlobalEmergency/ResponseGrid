import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import { usersTable, membershipsTable } from '../src/contexts/identity/infrastructure/drizzle/schema';
import { organizationMembersTable, organizationsTable } from '../src/contexts/organizations/infrastructure/drizzle/schema';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

describe('Organization flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    // clean slate for this test file
    const { db, pool } = createDb(DB_URL);
    try {
      await db.delete(organizationMembersTable);
      await db.delete(organizationsTable);
      await db.delete(membershipsTable);
      await db.delete(usersTable);
    } finally {
      await pool.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 201 and an accessToken for a new email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'orguser@reliefhub.org', password: 'password123', name: 'Org User' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('returns 409 Conflict when registering the same email twice', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'duplicate@reliefhub.org', password: 'password123', name: 'First' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'duplicate@reliefhub.org', password: 'other1234', name: 'Second' })
        .expect(409);
    });

    it('returns 400 for invalid body (missing name)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'noname@reliefhub.org', password: 'password123' })
        .expect(400);
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@reliefhub.org', password: 'short', name: 'Short' })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile when authenticated', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'meuser@reliefhub.org', password: 'password123', name: 'Me User' })
        .expect(201);
      const token = reg.body.accessToken as string;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('meuser@reliefhub.org');
      expect(res.body.name).toBe('Me User');
      expect(res.body).toHaveProperty('isAdmin');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('Organizations flow: register → create org → list mine', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'orgcreator@reliefhub.org', password: 'password123', name: 'Creator' })
        .expect(201);
      accessToken = res.body.accessToken as string;
    });

    it('POST /organizations requires auth (401 without token)', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Anon Org', type: 'ngo' })
        .expect(401);
    });

    it('POST /organizations returns 201 and id with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'My NGO', type: 'ngo' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('string');
    });

    it('GET /organizations/mine returns the created organization', async () => {
      // create org
      const createRes = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'My Association', type: 'association' })
        .expect(201);

      const orgId = createRes.body.id as string;

      const mineRes = await request(app.getHttpServer())
        .get('/organizations/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const orgIds = (mineRes.body as Array<{ id: string }>).map((o) => o.id);
      expect(orgIds).toContain(orgId);
    });

    it('GET /organizations/mine requires auth (401 without token)', async () => {
      await request(app.getHttpServer()).get('/organizations/mine').expect(401);
    });

    it('GET /organizations is public and includes created orgs', async () => {
      const res = await request(app.getHttpServer()).get('/organizations').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });

    it('POST /organizations with invalid type returns 400', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Bad Org', type: 'invalid_type' })
        .expect(400);
    });
  });

  describe('Organization members flow', () => {
    let ownerToken: string;
    let memberToken: string;
    let orgId: string;
    let memberId: string;

    beforeAll(async () => {
      // Register owner
      const ownerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'owner@reliefhub.org', password: 'password123', name: 'Owner User' })
        .expect(201);
      ownerToken = ownerRes.body.accessToken as string;

      // Register member
      const memberRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'newmember@reliefhub.org', password: 'password123', name: 'New Member' })
        .expect(201);
      memberToken = memberRes.body.accessToken as string;

      // Get member's userId via /auth/me
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      memberId = meRes.body.id as string;

      // Owner creates an org → becomes Owner
      const orgRes = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Members Test Org', type: 'ngo' })
        .expect(201);
      orgId = orgRes.body.id as string;
    });

    it('GET /organizations/{id}/members requires auth', async () => {
      await request(app.getHttpServer()).get(`/organizations/${orgId}/members`).expect(401);
    });

    it('GET /organizations/{id}/members returns owner for newly created org', async () => {
      const res = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const members = res.body as Array<{ userId: string; email: string; role: string }>;
      expect(members).toHaveLength(1);
      expect(members[0].email).toBe('owner@reliefhub.org');
      expect(members[0].role).toBe('owner');
    });

    it('POST /organizations/{id}/members adds a member (owner only)', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newmember@reliefhub.org' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const members = res.body as Array<{ userId: string; email: string; role: string }>;
      expect(members).toHaveLength(2);
      const newMember = members.find((m) => m.email === 'newmember@reliefhub.org');
      expect(newMember?.role).toBe('member');
    });

    it('POST /organizations/{id}/members returns 403 when non-owner tries to add', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'another@reliefhub.org' })
        .expect(403);
    });

    it('POST /organizations/{id}/members returns 404 when email does not exist', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'nobody@reliefhub.org' })
        .expect(404);
    });

    it('POST /organizations/{id}/members returns 409 when already a member', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newmember@reliefhub.org' })
        .expect(409);
    });

    it('member can list members (GET /organizations/{id}/members)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('DELETE /organizations/{id}/members/{userId} removes the member (owner only)', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const members = res.body as Array<{ userId: string }>;
      expect(members.find((m) => m.userId === memberId)).toBeUndefined();
    });

    it('DELETE /organizations/{id}/members/{userId} returns 403 when non-owner tries', async () => {
      // Re-add member first
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newmember@reliefhub.org' })
        .expect(201);

      // Now member tries to remove owner (should fail)
      const ownerMeRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const ownerId = ownerMeRes.body.id as string;

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/members/${ownerId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});
