import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';
import { createDb } from '../src/shared/db';
import {
  usersTable,
  grantsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';

const EM = '11111111-1111-4111-8111-111111111111';

// UUIDs distinct from the other resource e2e files.
const OWNER_ID = '28500000-0000-4000-8000-000000000001';
const MANAGER_ID = '28500000-0000-4000-8000-000000000002';
const STRANGER_ID = '28500000-0000-4000-8000-000000000003';
const GRANT_ID = '28500000-0000-4000-8000-000000000004';

const baseLocation = {
  address: 'Av. Urdaneta 10, Caracas',
  latitude: 10.5061,
  longitude: -66.9146,
};

interface MineRow {
  id: string;
  type: string;
  name: string;
  emergencyId: string;
  emergencySlug: string | null;
}

/**
 * `GET /resources/mine` (#285): the panel of a `point_manager` whose ONLY
 * grant is entity-scoped to their resource. Such a principal holds no
 * emergency-scoped grant, so `/emergencies/mine` is empty and the per-emergency
 * `/emergencies/{id}/resources/mine` can never be reached — this cross-emergency
 * endpoint is what surfaces their point.
 */
describe('GET /resources/mine (e2e, #285)', () => {
  let app: INestApplication;
  let server: Server;
  let ownerToken: string;
  let managerToken: string;
  let strangerToken: string;
  let ownedResourceId: string;
  let managedResourceId: string;

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
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;

    const { db, pool } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test',
    );
    try {
      await db
        .delete(grantsTable)
        .where(inArray(grantsTable.principalId, [MANAGER_ID]));
      await db
        .delete(usersTable)
        .where(inArray(usersTable.id, [OWNER_ID, MANAGER_ID, STRANGER_ID]));

      // Upsert the shared emergency: this spec asserts the canonical slug, so
      // force it in case another e2e file inserted the id with other values.
      await db
        .insert(emergenciesTable)
        .values({
          id: EM,
          name: 'Terremoto Venezuela 2026',
          slug: 'terremoto-venezuela-2026',
          country: 'VE',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: emergenciesTable.id,
          set: {
            name: 'Terremoto Venezuela 2026',
            slug: 'terremoto-venezuela-2026',
            country: 'VE',
            status: 'active',
          },
        });

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: OWNER_ID,
            email: 'owner-mine285@reliefhub.org',
            passwordHash: hash,
            name: 'Mine Owner',
            isAdmin: false,
          },
          {
            id: MANAGER_ID,
            email: 'manager-mine285@reliefhub.org',
            passwordHash: hash,
            name: 'Mine Manager',
            isAdmin: false,
          },
          {
            id: STRANGER_ID,
            email: 'stranger-mine285@reliefhub.org',
            passwordHash: hash,
            name: 'Mine Stranger',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const [ownerRes, managerRes, strangerRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'owner-mine285@reliefhub.org', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'manager-mine285@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'stranger-mine285@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
    ]);
    ownerToken = (ownerRes.body as { accessToken: string }).accessToken;
    managerToken = (managerRes.body as { accessToken: string }).accessToken;
    strangerToken = (strangerRes.body as { accessToken: string }).accessToken;

    // The owner registers two points; the second is run by MANAGER via an
    // entity-scoped grant (the acopiove.org-import shape: imported points get a
    // point_manager, not an owner).
    const created1 = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'collection_point',
        name: 'Acopio propio 285',
        location: baseLocation,
      })
      .expect(201);
    ownedResourceId = (created1.body as { id: string }).id;

    const created2 = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'collection_point',
        name: 'Acopio gestionado 285',
        location: baseLocation,
      })
      .expect(201);
    managedResourceId = (created2.body as { id: string }).id;

    const { db: db2, pool: pool2 } = createDb(
      process.env.DATABASE_URL ??
        'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test',
    );
    try {
      await db2
        .insert(grantsTable)
        .values({
          id: GRANT_ID,
          principalId: MANAGER_ID,
          principalType: 'user',
          roleId: 'point_manager',
          scopeType: 'entity',
          scopeEntityType: 'resource',
          scopeId: managedResourceId,
          grantedAt: new Date(),
        })
        .onConflictDoNothing();
    } finally {
      await pool2.end();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous callers', async () => {
    await request(server).get('/resources/mine').expect(401);
  });

  it('surfaces the point of a manager whose ONLY grant is entity-scoped (#285)', async () => {
    const res = await request(server)
      .get('/resources/mine')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const rows = res.body as MineRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: managedResourceId,
      type: 'collection_point',
      name: 'Acopio gestionado 285',
      emergencyId: EM,
      emergencySlug: 'terremoto-venezuela-2026',
    });

    // The failing precondition of #285: no emergency-scoped grant, so the old
    // per-emergency aggregation had nothing to iterate.
    const mine = await request(server)
      .get('/emergencies/mine')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(mine.body).toEqual([]);
  });

  it('returns every resource the owner owns, including grant-managed ones, without duplicates', async () => {
    const res = await request(server)
      .get('/resources/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const rows = res.body as MineRow[];
    const ids = rows.map((r) => r.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([ownedResourceId, managedResourceId]),
    );
  });

  it('returns an empty list for a principal with nothing to manage', async () => {
    const res = await request(server)
      .get('/resources/mine')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });
});
