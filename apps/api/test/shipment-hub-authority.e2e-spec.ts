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

// UUIDs distinct from the other e2e files.
const MANAGER_ID = '15000000-0000-4000-8000-000000000001';
const STRANGER_ID = '15000000-0000-4000-8000-000000000002';
const GRANT_ID = '15000000-0000-4000-8000-000000000003';
const HUB = '15000000-0000-4000-8000-0000000000a0';
const OTHER_HUB = '15000000-0000-4000-8000-0000000000b0';
const ORIGIN = '15000000-0000-4000-8000-0000000000c0';
const DEST = '15000000-0000-4000-8000-0000000000d0';

function shipmentBody(hubId: string | null): Record<string, unknown> {
  return {
    emergencyId: EM,
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    items: [{ name: 'Agua', quantity: 5, unit: 'l', category: 'water' }],
    ...(hubId !== null ? { hubId } : {}),
  };
}

/**
 * Hueco 2 (#150, §16.3 / #108): a `hub_manager` whose only grant is scoped to a
 * logistics hub can create and read the expeditions transiting that hub —
 * cross-emergency, without being a coordinator of the shipment's emergency — and
 * is denied the permissions the role does NOT confer (assign). Exercises the
 * real HTTP + PDP stack; there was no logistics e2e before this.
 */
describe('Shipment hub authority (e2e, #150)', () => {
  let app: INestApplication;
  let server: Server;
  let managerToken: string;
  let strangerToken: string;
  let shipmentId: string;

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
        .delete(usersTable)
        .where(inArray(usersTable.id, [MANAGER_ID, STRANGER_ID]));

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
          set: { status: 'active' },
        });

      const hash = await bcrypt.hash('Password1!', 10);
      await db
        .insert(usersTable)
        .values([
          {
            id: MANAGER_ID,
            email: 'hubmgr-150@reliefhub.org',
            passwordHash: hash,
            name: 'Hub Manager',
            isAdmin: false,
          },
          {
            id: STRANGER_ID,
            email: 'stranger-150@reliefhub.org',
            passwordHash: hash,
            name: 'Stranger',
            isAdmin: false,
          },
        ])
        .onConflictDoNothing();

      // The manager's ONLY grant: hub_manager scoped to HUB (no emergency
      // membership, no coordinator role).
      await db
        .insert(grantsTable)
        .values({
          id: GRANT_ID,
          principalId: MANAGER_ID,
          principalType: 'user',
          roleId: 'hub_manager',
          scopeType: 'hub',
          scopeId: HUB,
          grantedAt: new Date(),
        })
        .onConflictDoNothing();
    } finally {
      await pool.end();
    }

    const [managerRes, strangerRes] = await Promise.all([
      request(server)
        .post('/auth/login')
        .send({ email: 'hubmgr-150@reliefhub.org', password: 'Password1!' })
        .expect(200),
      request(server)
        .post('/auth/login')
        .send({ email: 'stranger-150@reliefhub.org', password: 'Password1!' })
        .expect(200),
    ]);
    managerToken = (managerRes.body as { accessToken: string }).accessToken;
    strangerToken = (strangerRes.body as { accessToken: string }).accessToken;

    // The hub manager creates the expedition transiting THEIR hub — the core of
    // Hueco 2: cross-emergency authority without coordinating the emergency.
    const created = await request(server)
      .post('/logistics/shipments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(shipmentBody(HUB))
      .expect(201);
    shipmentId = (created.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('created the expedition for the hub manager (set up in beforeAll)', () => {
    expect(shipmentId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('403s the hub manager on a shipment through a hub they do not manage', async () => {
    await request(server)
      .post('/logistics/shipments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(shipmentBody(OTHER_HUB))
      .expect(403);
  });

  it('403s the hub manager when no hub is declared (no coordinator authority)', async () => {
    await request(server)
      .post('/logistics/shipments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(shipmentBody(null))
      .expect(403);
  });

  it('403s a stranger even for the managed hub', async () => {
    await request(server)
      .post('/logistics/shipments')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send(shipmentBody(HUB))
      .expect(403);
  });

  it('lets the hub manager read capacity suggestions (shipment:read)', async () => {
    await request(server)
      .get(`/logistics/shipments/${shipmentId}/capacity-suggestions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
  });

  it('403s the hub manager on assign-capacity (role lacks shipment:assign)', async () => {
    await request(server)
      .post(`/logistics/shipments/${shipmentId}/assign-capacity`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ assignedCapacityId: '15000000-0000-4000-8000-0000000000e0' })
      .expect(403);
  });
});
