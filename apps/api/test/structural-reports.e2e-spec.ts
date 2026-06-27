/**
 * E2E: F03 — Structural damage and trapped-persons SAR reports.
 *
 * Covers:
 * - Creating a trapped_persons report with priority low → auto-elevated to urgent
 * - Creating a structural_damage report with collapsed level → auto-elevated to urgent
 * - Structural report roundtrips structural fields through POST→GET
 * - Coordinator can review (open→reviewed) then publish (reviewed→published)
 * - Published report appears in GET /damage-layer; unpublished ones do not
 * - GET /damage-layer is public (no JWT required)
 * - GET /damage-layer does NOT expose reporterUserId
 * - POST /reports/:id/publish by non-coordinator → 403
 * - POST /emergencies/:id/reports without auth → 401
 * - POST /reports/:id/publish when report is still open (not reviewed) → 422
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../src/contexts/needs/infrastructure/http/domain-exception.filter';
import { ReportExceptionFilter } from '../src/contexts/reports/infrastructure/http/report-exception.filter';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';
import { reportsTable } from '../src/contexts/reports/infrastructure/drizzle/schema';
import * as bcrypt from 'bcryptjs';

// Unique IDs for this spec to avoid cross-spec conflicts
const EM = 'ff030000-0000-4000-8000-000000000001';
const COORD_ID = 'ff030000-0000-4000-8000-000000000002';
const REPORTER_ID = 'ff030000-0000-4000-8000-000000000003';
const COORD_MEMBERSHIP_ID = 'ff030000-0000-4000-8000-000000000004';

describe('Structural SAR reports (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let coordToken: string;
  let reporterToken: string;

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
      new ReportExceptionFilter(),
    );
    await app.init();
    server = app.getHttpServer() as Server;

    // Seed test data
    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub',
    );
    try {
      // Clean up only our reports (not others)
      await db.delete(reportsTable).where(
        // We rely on beforeAll isolation; nuke all to get a clean slate for our EM
        undefined,
      );

      // Seed emergency
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'SAR E2E Emergency',
          slug: 'sar-e2e-emergency',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      // Seed coordinator
      const coordHash = await bcrypt.hash('coord1234', 10);
      await db
        .insert(usersTable)
        .values({
          id: COORD_ID,
          email: 'sar-coord@reliefhub.org',
          passwordHash: coordHash,
          name: 'SAR Coordinator',
          isAdmin: false,
        })
        .onConflictDoNothing();
      await db
        .insert(membershipsTable)
        .values({
          id: COORD_MEMBERSHIP_ID,
          userId: COORD_ID,
          emergencyId: EM,
          role: 'coordinator',
        })
        .onConflictDoNothing();

      // Seed reporter (no coordinator role)
      const reporterHash = await bcrypt.hash('reporter1234', 10);
      await db
        .insert(usersTable)
        .values({
          id: REPORTER_ID,
          email: 'sar-reporter@reliefhub.org',
          passwordHash: reporterHash,
          name: 'SAR Reporter',
          isAdmin: false,
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    // Obtain tokens
    const [coordLogin, reporterLogin] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'sar-coord@reliefhub.org', password: 'coord1234' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'sar-reporter@reliefhub.org',
          password: 'reporter1234',
        })
        .expect(200),
    ]);
    coordToken = (coordLogin.body as { accessToken: string }).accessToken;
    reporterToken = (reporterLogin.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST without auth returns 401', async () => {
    await request(server)
      .post(`/emergencies/${EM}/reports`)
      .send({
        type: 'trapped_persons',
        note: 'No auth test',
        priority: 'low',
        structuralDetail: { damageLevel: 'severe' },
      })
      .expect(401);
  });

  it('creating a trapped_persons report with priority low → auto-elevated to urgent', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        type: 'trapped_persons',
        note: 'People trapped in rubble after earthquake',
        priority: 'low',
        structuralDetail: {
          damageLevel: 'severe',
          trappedPersonsEstimate: 4,
          accessibleForRescue: true,
          buildingType: 'residential',
        },
        location: {
          address: 'Calle Rescate 1, Caracas',
          latitude: 10.49,
          longitude: -66.87,
        },
      })
      .expect(201);

    const { id } = res.body as { id: string };
    expect(typeof id).toBe('string');

    // Verify in the coordinator queue that priority was elevated
    const queueRes = await request(server)
      .get(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const queue = queueRes.body as {
      id: string;
      priority: string;
      type: string;
      damageLevel: string;
      trappedPersonsEstimate: number;
    }[];
    const found = queue.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found!.priority).toBe('urgent');
    expect(found!.type).toBe('trapped_persons');
    expect(found!.damageLevel).toBe('severe');
    expect(found!.trappedPersonsEstimate).toBe(4);
  });

  it('creating structural_damage with collapsed level → auto-elevated to urgent', async () => {
    const res = await request(server)
      .post(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        type: 'structural_damage',
        note: 'Building fully collapsed',
        priority: 'medium',
        structuralDetail: {
          damageLevel: 'collapsed',
        },
      })
      .expect(201);

    const { id } = res.body as { id: string };

    const queueRes = await request(server)
      .get(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const found = (queueRes.body as { id: string; priority: string }[]).find(
      (r) => r.id === id,
    );
    expect(found!.priority).toBe('urgent');
  });

  it('review → publish flow → report appears in damage-layer', async () => {
    // 1. Create structural report
    const createRes = await request(server)
      .post(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        type: 'structural_damage',
        note: 'Partially collapsed school',
        priority: 'high',
        structuralDetail: {
          damageLevel: 'severe',
          trappedPersonsEstimate: 2,
          accessibleForRescue: false,
          buildingType: 'school',
        },
        location: {
          address: 'Calle Escuela 5, Caracas',
          latitude: 10.5,
          longitude: -66.9,
        },
        photoUrls: [],
      })
      .expect(201);

    const { id: reportId } = createRes.body as { id: string };

    // 2. Verify not yet in damage-layer (status is open)
    const layerBefore = await request(server)
      .get(`/emergencies/${EM}/reports/damage-layer`)
      .expect(200);
    const featuresBefore = (
      layerBefore.body as { features: { properties: { id: string } }[] }
    ).features;
    expect(
      featuresBefore.find((f) => f.properties.id === reportId),
    ).toBeUndefined();

    // 3. Review it
    await request(server)
      .post(`/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // 4. Still not in damage-layer (reviewed but not published)
    const layerAfterReview = await request(server)
      .get(`/emergencies/${EM}/reports/damage-layer`)
      .expect(200);
    const featuresAfterReview = (
      layerAfterReview.body as { features: { properties: { id: string } }[] }
    ).features;
    expect(
      featuresAfterReview.find((f) => f.properties.id === reportId),
    ).toBeUndefined();

    // 5. Publish it
    await request(server)
      .post(`/reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ publishNote: 'Verified on site by SAR team' })
      .expect(204);

    // 6. Now appears in damage-layer
    const layerAfterPublish = await request(server)
      .get(`/emergencies/${EM}/reports/damage-layer`)
      .expect(200);

    const { type: collectionType, features } = layerAfterPublish.body as {
      type: string;
      features: {
        type: string;
        geometry: { type: string; coordinates: [number, number] } | null;
        properties: {
          id: string;
          type: string;
          damageLevel: string;
          trappedPersonsEstimate: number;
          publishNote: string;
          publishedAt: string;
          thumbnailUrl: string | null;
        };
      }[];
    };

    expect(collectionType).toBe('FeatureCollection');
    const published = features.find((f) => f.properties.id === reportId);
    expect(published).toBeDefined();
    expect(published!.type).toBe('Feature');
    expect(published!.geometry?.type).toBe('Point');
    expect(published!.geometry?.coordinates).toEqual([-66.9, 10.5]);
    expect(published!.properties.damageLevel).toBe('severe');
    expect(published!.properties.trappedPersonsEstimate).toBe(2);
    expect(published!.properties.publishNote).toBe(
      'Verified on site by SAR team',
    );
    expect(published!.properties.publishedAt).not.toBeNull();
  });

  it('damage-layer is public — no JWT required', async () => {
    // No Authorization header
    await request(server)
      .get(`/emergencies/${EM}/reports/damage-layer`)
      .expect(200);
  });

  it('damage-layer does NOT expose reporterUserId', async () => {
    const res = await request(server)
      .get(`/emergencies/${EM}/reports/damage-layer`)
      .expect(200);

    const { features } = res.body as {
      features: { properties: Record<string, unknown> }[];
    };
    for (const feature of features) {
      expect('reporterUserId' in feature.properties).toBe(false);
    }
  });

  it('non-coordinator trying to publish → 403', async () => {
    // Create a report and review it first
    const createRes = await request(server)
      .post(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        type: 'structural_damage',
        note: 'Another damaged building',
        priority: 'medium',
        structuralDetail: { damageLevel: 'moderate' },
      })
      .expect(201);
    const { id: reportId } = createRes.body as { id: string };

    await request(server)
      .post(`/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);

    // Reporter (non-coordinator) tries to publish → 403
    await request(server)
      .post(`/reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({ publishNote: 'Should not work' })
      .expect(403);
  });

  it('publishing a report still in open status (not reviewed) → 422', async () => {
    const createRes = await request(server)
      .post(`/emergencies/${EM}/reports`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        type: 'structural_damage',
        note: 'Open report publish attempt',
        priority: 'high',
        structuralDetail: { damageLevel: 'severe' },
      })
      .expect(201);
    const { id: reportId } = createRes.body as { id: string };

    // Try to publish without reviewing first
    await request(server)
      .post(`/reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(422);
  });

  it('coordinator can filter the queue by type=structural_damage', async () => {
    const queueRes = await request(server)
      .get(`/emergencies/${EM}/reports?type=structural_damage`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const reports = queueRes.body as { type: string }[];
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r) => r.type === 'structural_damage')).toBe(true);
  });

  it('coordinator can filter the queue by type=trapped_persons', async () => {
    const queueRes = await request(server)
      .get(`/emergencies/${EM}/reports?type=trapped_persons`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(200);

    const reports = queueRes.body as { type: string }[];
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r) => r.type === 'trapped_persons')).toBe(true);
  });
});
