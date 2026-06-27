/**
 * E2E: Emergency templates — F5a feature.
 *
 * Covers:
 * - Admin creates a template → 201
 * - Non-admin cannot create a template → 403
 * - Admin lists templates → 200
 * - Admin deletes template → 204
 * - Delete non-existent template → 404
 * - Admin creates emergency from template → 201
 * - Resulting emergency has dontBringList and announcement from template
 * - Non-admin cannot create emergency from template → 403
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { EmergencyExceptionFilter } from '../src/contexts/emergencies/infrastructure/http/emergency-exception.filter';
import { TemplateExceptionFilter } from '../src/contexts/templates/infrastructure/http/template-exception.filter';
import { createDb } from '../src/shared/db';
import { usersTable } from '../src/contexts/identity/infrastructure/drizzle/schema';
import { templatesTable } from '../src/contexts/templates/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

const ADMIN_T_ID = 'f5000000-0000-4000-8000-000000000001';
const USER_T_ID = 'f5000000-0000-4000-8000-000000000002';

describe('Templates (e2e)', () => {
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
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new EmergencyExceptionFilter(),
      new TemplateExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      await db.delete(templatesTable);
      await db.delete(emergenciesTable);

      await db
        .insert(usersTable)
        .values({
          id: ADMIN_T_ID,
          email: 'admin-t@reliefhub.org',
          passwordHash: await bcrypt.hash('admin1234', 10),
          name: 'Admin Templates',
          isAdmin: true,
        })
        .onConflictDoNothing();

      await db
        .insert(usersTable)
        .values({
          id: USER_T_ID,
          email: 'user-t@reliefhub.org',
          passwordHash: await bcrypt.hash('user1234', 10),
          name: 'Regular User Templates',
          isAdmin: false,
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const adminLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'admin-t@reliefhub.org', password: 'admin1234' })
      .expect(200);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    const userLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'user-t@reliefhub.org', password: 'user1234' })
      .expect(200);
    userToken = (userLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  let createdTemplateId: string;

  // ── 1. Admin creates a template ────────────────────────────────────────────

  it('admin creates a template → 201', async () => {
    const res = await request(server)
      .post('/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Terremoto básico',
        description: 'Template para terremotos de magnitud moderada',
        dontBringList: ['mascotas', 'joyas'],
        defaultAnnouncement: 'No traer mascotas al centro de acopio.',
      })
      .expect(201);

    const body = res.body as { id: string };
    expect(typeof body.id).toBe('string');
    createdTemplateId = body.id;
  });

  // ── 2. Non-admin cannot create template ───────────────────────────────────

  it('non-admin cannot create a template → 403', async () => {
    await request(server)
      .post('/templates')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Should fail',
        description: 'Desc',
        dontBringList: [],
      })
      .expect(403);
  });

  // ── 3. Unauthenticated cannot create template ─────────────────────────────

  it('unauthenticated cannot create a template → 401', async () => {
    await request(server)
      .post('/templates')
      .send({
        name: 'Should fail',
        description: 'Desc',
        dontBringList: [],
      })
      .expect(401);
  });

  // ── 4. Admin lists templates ───────────────────────────────────────────────

  it('admin lists templates → 200 with at least 1 template', async () => {
    const res = await request(server)
      .get('/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body as Array<{
      id: string;
      name: string;
      dontBringList: string[];
      defaultAnnouncement: string | null;
    }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    const found = body.find((t) => t.id === createdTemplateId);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Terremoto básico');
    expect(found?.dontBringList).toEqual(['mascotas', 'joyas']);
    expect(found?.defaultAnnouncement).toBe(
      'No traer mascotas al centro de acopio.',
    );
  });

  // ── 5. Create emergency from template ─────────────────────────────────────

  it('admin creates emergency from template → 201', async () => {
    const res = await request(server)
      .post('/emergencies/from-template')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId: createdTemplateId,
        name: 'Terremoto Valencia 2026',
        slug: 'terremoto-valencia-2026',
        country: 'ES',
      })
      .expect(201);

    const body = res.body as { id: string; slug: string };
    expect(typeof body.id).toBe('string');
    expect(body.slug).toBe('terremoto-valencia-2026');
  });

  // ── 6. Emergency public view includes dontBringList and announcement ───────

  it('public emergency view includes dontBringList and announcement from template', async () => {
    const res = await request(server)
      .get('/emergencies/by-slug/terremoto-valencia-2026')
      .expect(200);

    const body = res.body as {
      dontBringList: string[];
      announcement: string | null;
      status: string;
    };
    expect(body.dontBringList).toEqual(['mascotas', 'joyas']);
    expect(body.announcement).toBe('No traer mascotas al centro de acopio.');
    expect(body.status).toBe('active');
  });

  // ── 7. Non-admin cannot create emergency from template ────────────────────

  it('non-admin cannot create emergency from template → 403', async () => {
    await request(server)
      .post('/emergencies/from-template')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        templateId: createdTemplateId,
        name: 'Blocked Emergency',
        slug: 'blocked-emergency',
        country: 'ES',
      })
      .expect(403);
  });

  // ── 8. from-template with non-existent template → 404 ────────────────────

  it('from-template with unknown templateId → 404', async () => {
    await request(server)
      .post('/emergencies/from-template')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        name: 'Missing Template Emergency',
        slug: 'missing-template-emergency',
        country: 'ES',
      })
      .expect(404);
  });

  // ── 9. Admin deletes template → 204 ───────────────────────────────────────

  it('admin deletes template → 204', async () => {
    // Create a disposable template first
    const createRes = await request(server)
      .post('/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'To Delete',
        description: 'Will be deleted',
        dontBringList: [],
      })
      .expect(201);

    const { id } = createRes.body as { id: string };

    await request(server)
      .delete(`/templates/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  // ── 10. Delete non-existent template → 404 ───────────────────────────────

  it('delete non-existent template → 404', async () => {
    await request(server)
      .delete('/templates/ffffffff-ffff-4fff-8fff-ffffffffffff')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
