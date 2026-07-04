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
  membershipsTable,
} from '../src/contexts/identity/infrastructure/drizzle/schema';
import { emergenciesTable } from '../src/contexts/emergencies/infrastructure/drizzle/schema';

const EM = '11111111-1111-4111-8111-111111111111';

// UUIDs distinct from the other resource e2e files.
const OWNER_ID = '31600000-0000-4000-8000-000000000001';
const COORD_ID = '31600000-0000-4000-8000-000000000002';
const MANAGER_ID = '31600000-0000-4000-8000-000000000003';
const STRANGER_ID = '31600000-0000-4000-8000-000000000004';
const GRANT_ID = '31600000-0000-4000-8000-000000000005';
const COORD_MEMBERSHIP_ID = '31600000-0000-4000-8000-000000000006';

const baseLocation = {
  address: 'Av. Urdaneta 20, Caracas',
  latitude: 10.5061,
  longitude: -66.9146,
};

interface Line {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
}

/**
 * The gestor journey (#316): a `point_manager` whose ONLY grant is
 * entity-scoped to their resource must be able to OPERATE it — read and replace
 * its declared inventory and change its public status — not merely see it in the
 * panel (#285). Exercises the real HTTP stack so the shared
 * `loadResourceForManagement` gate is proven to honour entity grants.
 */
describe('Resource management by entity-scoped grant (e2e, #316)', () => {
  let app: INestApplication;
  let server: Server;
  let ownerToken: string;
  let coordToken: string;
  let managerToken: string;
  let strangerToken: string;
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

    const dbUrl =
      process.env.DATABASE_URL ??
      'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

    const { db, pool } = createDb(dbUrl);
    try {
      await db
        .delete(grantsTable)
        .where(inArray(grantsTable.principalId, [MANAGER_ID]));
      await db
        .delete(membershipsTable)
        .where(inArray(membershipsTable.userId, [COORD_ID]));
      await db
        .delete(usersTable)
        .where(
          inArray(usersTable.id, [OWNER_ID, COORD_ID, MANAGER_ID, STRANGER_ID]),
        );

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
        .onConflictDoNothing();

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: OWNER_ID,
            email: 'owner-manage316@reliefhub.org',
            passwordHash: hash,
            name: 'Manage Owner',
            isAdmin: false,
          },
          {
            id: COORD_ID,
            email: 'coord-manage316@reliefhub.org',
            passwordHash: hash,
            name: 'Manage Coordinator',
            isAdmin: false,
          },
          {
            id: MANAGER_ID,
            email: 'manager-manage316@reliefhub.org',
            passwordHash: hash,
            name: 'Manage Manager',
            isAdmin: false,
          },
          {
            id: STRANGER_ID,
            email: 'stranger-manage316@reliefhub.org',
            passwordHash: hash,
            name: 'Manage Stranger',
            isAdmin: false,
          },
        ])
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
    } finally {
      await pool.end();
    }

    const [ownerRes, coordRes, managerRes, strangerRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({
          email: 'owner-manage316@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'coord-manage316@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'manager-manage316@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({
          email: 'stranger-manage316@reliefhub.org',
          password: 'Password1!',
        })
        .expect(200),
    ]);
    ownerToken = (ownerRes.body as { accessToken: string }).accessToken;
    coordToken = (coordRes.body as { accessToken: string }).accessToken;
    managerToken = (managerRes.body as { accessToken: string }).accessToken;
    strangerToken = (strangerRes.body as { accessToken: string }).accessToken;

    // Owner registers the point with one declared line; MANAGER will run it via
    // an entity-scoped grant (the acopiove.org-import shape: imported points get
    // a point_manager, not an owner).
    const created = await request(server)
      .post(`/emergencies/${EM}/resources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'collection_point',
        name: 'Acopio gestionado 316',
        location: baseLocation,
        items: [{ name: 'Agua', quantity: 10, unit: 'l', category: 'water' }],
      })
      .expect(201);
    managedResourceId = (created.body as { id: string }).id;

    const { db: db2, pool: pool2 } = createDb(dbUrl);
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

    // Publish it (coordinator) so the public-status transition is legal.
    await request(server)
      .post(`/resources/${managedResourceId}/verify`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({})
      .expect(204);
    await request(server)
      .post(`/resources/${managedResourceId}/publish`)
      .set('Authorization', `Bearer ${coordToken}`)
      .expect(204);
  });

  afterAll(async () => {
    await app.close();
  });

  it('the manager reads the full declared inventory of their point', async () => {
    const res = await request(server)
      .get(`/resources/${managedResourceId}/inventory`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const lines = res.body as Line[];
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ name: 'Agua', quantity: 10 });
  });

  it('the manager replaces the declared inventory of their point', async () => {
    await request(server)
      .put(`/resources/${managedResourceId}/inventory`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        items: [{ name: 'Arroz', quantity: 3, unit: 'kg', category: 'food' }],
      })
      .expect(204);

    const res = await request(server)
      .get(`/resources/${managedResourceId}/inventory`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    const lines = res.body as Line[];
    expect(lines.map((l) => l.name)).toEqual(['Arroz']);
  });

  it('the manager changes the public status of their point', async () => {
    await request(server)
      .post(`/resources/${managedResourceId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'saturated' })
      .expect(204);

    const publicList = await request(server)
      .get(`/emergencies/${EM}/public/resources`)
      .expect(200);
    const found = (
      publicList.body as { items: Array<{ id: string; publicStatus: string }> }
    ).items.find((r) => r.id === managedResourceId);
    expect(found?.publicStatus).toBe('saturated');
  });

  it('a stranger (no owner/grant/coordinator) cannot replace the inventory → 403', async () => {
    await request(server)
      .put(`/resources/${managedResourceId}/inventory`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({
        items: [{ name: 'Nada', quantity: 1, unit: 'u', category: 'other' }],
      })
      .expect(403);
  });

  it('a stranger (no owner/grant/coordinator) cannot change the status → 403', async () => {
    await request(server)
      .post(`/resources/${managedResourceId}/status`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ status: 'paused' })
      .expect(403);
  });
});
