/**
 * E2E: Accreditation context + Official derivation.
 *
 * Covers:
 * - Admin can grant accreditation (global and per-emergency).
 * - Non-admin gets 403 on grant.
 * - Verifying a resource of an accredited org yields Official.
 * - Verifying a resource of a non-accredited org yields Verified.
 * - Verifying a resource with no owner org (personal) yields Verified.
 * - Admin can revoke and list accreditations.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { AccreditationExceptionFilter } from '../src/contexts/accreditation/infrastructure/http/accreditation-exception.filter';
import { createDb } from '../src/shared/db';
import { resourcesTable } from '../src/contexts/resources/infrastructure/drizzle/schema';
import { accreditationsTable } from '../src/contexts/accreditation/infrastructure/drizzle/schema';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { organizationsTable } from '../src/contexts/organizations/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// Unique IDs for this spec — non-overlapping with other e2e files
const EM = 'f0000000-0000-4000-8000-000000000001';
const ADMIN_ID = 'f0000000-0000-4000-8000-000000000002';
const COORD_ID = 'f0000000-0000-4000-8000-000000000003';
const MEMBERSHIP_ID = 'f0000000-0000-4000-8000-000000000004';
const ORG_ID = 'f0000000-0000-4000-8000-000000000005';
const UNACCREDITED_ORG_ID = 'f0000000-0000-4000-8000-000000000006';

const baseLocation = {
  address: 'Av. Accreditation 1, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

describe('Accreditation (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let coordToken: string;

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
      new AccreditationExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean up
      await db.delete(accreditationsTable);
      await db.delete(resourcesTable);
      await db.delete(membershipsTable);
      await db.delete(usersTable);
      await db.delete(organizationsTable);

      // Emergency
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Accreditation E2E Emergency',
          slug: 'accreditation-e2e-emergency',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      // Organizations
      await db
        .insert(organizationsTable)
        .values([
          {
            id: ORG_ID,
            name: 'Cruz Roja Test',
            type: 'ngo',
            verificationLevel: 'unverified',
            createdAt: new Date(),
          },
          {
            id: UNACCREDITED_ORG_ID,
            name: 'Unaccredited Org',
            type: 'company',
            verificationLevel: 'unverified',
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Admin user
      const adminHash = await bcrypt.hash('admin1234', 10);
      await db.insert(usersTable).values({
        id: ADMIN_ID,
        email: 'admin@reliefhub-acctest.org',
        passwordHash: adminHash,
        name: 'Admin',
        isAdmin: true,
      });

      // Coordinator user
      const coordHash = await bcrypt.hash('coord1234', 10);
      await db.insert(usersTable).values({
        id: COORD_ID,
        email: 'coord@reliefhub-acctest.org',
        passwordHash: coordHash,
        name: 'Coordinator',
        isAdmin: false,
      });
      await db.insert(membershipsTable).values({
        id: MEMBERSHIP_ID,
        userId: COORD_ID,
        emergencyId: EM,
        role: 'coordinator',
      });
    } finally {
      await pool.end();
    }

    // Login admin
    const adminLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@reliefhub-acctest.org', password: 'admin1234' })
      .expect(200);
    adminToken = (adminLogin.body as { accessToken: string }).accessToken;

    // Login coordinator
    const coordLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'coord@reliefhub-acctest.org', password: 'coord1234' })
      .expect(200);
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /accreditations (grant)', () => {
    it('non-admin receives 403', async () => {
      await request(server)
        .post('/accreditations')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ organizationId: ORG_ID, scope: 'global' })
        .expect(403);
    });

    it('unauthenticated receives 401', async () => {
      await request(server)
        .post('/accreditations')
        .send({ organizationId: ORG_ID, scope: 'global' })
        .expect(401);
    });

    it('admin grants global accreditation and gets 201 with id', async () => {
      const res = await request(server)
        .post('/accreditations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ organizationId: ORG_ID, scope: 'global', evidence: 'e2e test' })
        .expect(201);
      expect((res.body as { id: string }).id).toBeDefined();
    });
  });

  describe('Official derivation on verify', () => {
    let accrId: string;

    beforeAll(async () => {
      // Ensure the org is accredited for this emergency
      const res = await request(server)
        .post('/accreditations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organizationId: ORG_ID,
          scope: { emergencyId: EM },
          evidence: 'e2e-derive',
        })
        .expect(201);
      accrId = (res.body as { id: string }).id;
    });

    it('resource of accredited org becomes Official after verify', async () => {
      // Register resource with ownerOrganizationId = ORG_ID (accredited)
      const created = await request(server)
        .post(`/emergencies/${EM}/resources`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          type: 'warehouse',
          stage: 'origin',
          name: 'Almacén Oficial E2E',
          location: baseLocation,
          ownerOrganizationId: ORG_ID,
        })
        .expect(201);
      const id = (created.body as { id: string }).id;

      // Verify (no level in body — it's derived)
      await request(server)
        .post(`/resources/${id}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(204);

      // Publish and check public list shows verificationLevel
      await request(server)
        .post(`/resources/${id}/publish`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);

      const pub = await request(server)
        .get(`/emergencies/${EM}/public/resources`)
        .expect(200);
      const resource = (
        pub.body as { items: { id: string; verificationLevel: string }[] }
      ).items.find((r) => r.id === id);
      expect(resource?.verificationLevel).toBe('official');
    });

    it('resource of non-accredited org becomes Verified after verify', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM}/resources`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          type: 'venue',
          stage: 'destination',
          name: 'Venue No-accredit E2E',
          location: baseLocation,
          ownerOrganizationId: UNACCREDITED_ORG_ID,
        })
        .expect(201);
      const id = (created.body as { id: string }).id;

      await request(server)
        .post(`/resources/${id}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(204);

      await request(server)
        .post(`/resources/${id}/publish`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);

      const pub = await request(server)
        .get(`/emergencies/${EM}/public/resources`)
        .expect(200);
      const resource = (
        pub.body as { items: { id: string; verificationLevel: string }[] }
      ).items.find((r) => r.id === id);
      expect(resource?.verificationLevel).toBe('verified');
    });

    it('personal resource (no org) becomes Verified after verify', async () => {
      const created = await request(server)
        .post(`/emergencies/${EM}/resources`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          type: 'transport',
          stage: 'intermediate',
          name: 'Furgón Personal E2E',
          location: baseLocation,
          // no ownerOrganizationId
        })
        .expect(201);
      const id = (created.body as { id: string }).id;

      await request(server)
        .post(`/resources/${id}/verify`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({})
        .expect(204);

      await request(server)
        .post(`/resources/${id}/publish`)
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(204);

      const pub = await request(server)
        .get(`/emergencies/${EM}/public/resources`)
        .expect(200);
      const resource = (
        pub.body as { items: { id: string; verificationLevel: string }[] }
      ).items.find((r) => r.id === id);
      expect(resource?.verificationLevel).toBe('verified');
    });

    afterAll(async () => {
      // Revoke the accreditation created in beforeAll
      if (accrId) {
        await request(server)
          .delete(`/accreditations/${accrId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
      }
    });
  });

  describe('DELETE /accreditations/:id', () => {
    it('returns 404 for non-existent accreditation', async () => {
      await request(server)
        .delete('/accreditations/99999999-9999-4999-8999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin can revoke an accreditation', async () => {
      // Use UNACCREDITED_ORG_ID: it has no existing accreditations so the grant
      // succeeds regardless of the accreditations created by earlier suites.
      const res = await request(server)
        .post('/accreditations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ organizationId: UNACCREDITED_ORG_ID, scope: 'global' })
        .expect(201);
      const id = (res.body as { id: string }).id;

      await request(server)
        .delete(`/accreditations/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('GET /accreditations', () => {
    beforeAll(async () => {
      // Grant a fresh accreditation for list tests
      await request(server)
        .post('/accreditations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ organizationId: ORG_ID, scope: { emergencyId: EM } })
        .expect(201);
    });

    it('admin can list accreditations', async () => {
      const res = await request(server)
        .get('/accreditations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });

    it('can filter by organizationId', async () => {
      const res = await request(server)
        .get(`/accreditations?organizationId=${ORG_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const list = res.body as { organizationId: string }[];
      expect(list.every((a) => a.organizationId === ORG_ID)).toBe(true);
    });

    it('non-admin receives 403', async () => {
      await request(server)
        .get('/accreditations')
        .set('Authorization', `Bearer ${coordToken}`)
        .expect(403);
    });
  });
});
