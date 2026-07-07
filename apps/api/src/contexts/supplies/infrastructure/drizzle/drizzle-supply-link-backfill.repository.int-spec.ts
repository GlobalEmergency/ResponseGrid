import { eq } from 'drizzle-orm';
import { createDb, Db } from '../../../../shared/db';
import { containersTable, suppliesTable } from './schema';
import {
  needItemsTable,
  needsTable,
} from '../../../needs/infrastructure/drizzle/schema';
import {
  offerItemsTable,
  offersTable,
} from '../../../offers/infrastructure/drizzle/schema';
import {
  donationIntakeLinesTable,
  donationIntakesTable,
} from '../../../offers/infrastructure/drizzle/donation-intake-schema';
import {
  resourceItemsTable,
  resourcesTable,
} from '../../../resources/infrastructure/drizzle/schema';
import { DrizzleSupplyLinkBackfillRepository } from './drizzle-supply-link-backfill.repository';
import type {
  SupplyLineSnapshot,
  Category,
} from '@globalemergency/warehouse-core/kernel';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const EM = '55555555-5555-4555-8555-555555555555';
const USER = '77777777-7777-4777-8777-777777777777';
const SUPPLY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUPPLY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NEED = '11111111-2222-4333-8444-555555555501';
const OFFER = '11111111-2222-4333-8444-555555555502';
const RESOURCE = '11111111-2222-4333-8444-555555555503';
const INTAKE = '11111111-2222-4333-8444-555555555504';
const CONTAINER = '11111111-2222-4333-8444-555555555505';

const NOW = new Date('2026-07-01T00:00:00.000Z');

function containerLine(
  name: string,
  supplyId: string | null,
): SupplyLineSnapshot {
  return {
    name,
    quantity: 1,
    unit: null,
    category: 'water' as Category,
    supplyId,
    presentation: null,
    expiresAt: null,
  };
}

describe('DrizzleSupplyLinkBackfillRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleSupplyLinkBackfillRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleSupplyLinkBackfillRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(needItemsTable);
    await db.delete(needsTable);
    await db.delete(offerItemsTable);
    await db.delete(offersTable);
    await db.delete(donationIntakeLinesTable);
    await db.delete(donationIntakesTable);
    await db.delete(resourceItemsTable);
    await db.delete(resourcesTable);
    await db.delete(containersTable);
    await db.delete(suppliesTable);

    await db.insert(suppliesTable).values([
      {
        id: SUPPLY_A,
        code: 'INS-9001',
        name: 'Agua potable',
        categorySlug: 'water',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: SUPPLY_B,
        code: 'INS-9002',
        name: 'Harina de maíz',
        categorySlug: 'food',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);

    await db.insert(needsTable).values({
      id: NEED,
      emergencyId: EM,
      title: 'Necesidad test',
      address: 'Calle 1',
      latitude: 0,
      longitude: 0,
      priority: 'high',
      requesterUserId: USER,
      status: 'published',
      createdAt: NOW,
    });
    await db.insert(needItemsTable).values([
      {
        id: '21111111-2222-4333-8444-555555555511',
        needId: NEED,
        name: 'AGUA Potable',
        quantity: 3,
        category: 'water',
      },
      {
        id: '21111111-2222-4333-8444-555555555512',
        needId: NEED,
        name: 'AGUA Potable',
        quantity: 1,
        category: 'water',
      },
      // Enlace manual previo: el backfill NUNCA debe tocarlo.
      {
        id: '21111111-2222-4333-8444-555555555513',
        needId: NEED,
        name: 'AGUA Potable',
        quantity: 2,
        category: 'water',
        supplyId: SUPPLY_B,
      },
    ]);

    await db.insert(offersTable).values({
      id: OFFER,
      emergencyId: EM,
      donorUserId: USER,
      address: 'Calle 2',
      latitude: 0,
      longitude: 0,
      status: 'pending',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await db.insert(offerItemsTable).values({
      id: '21111111-2222-4333-8444-555555555521',
      offerId: OFFER,
      name: 'agua embotellada',
      quantity: 5,
      category: 'water',
    });

    await db.insert(resourcesTable).values({
      id: RESOURCE,
      emergencyId: EM,
      type: 'collection_point',
      name: 'Punto test',
      address: 'Calle 3',
      latitude: 0,
      longitude: 0,
      ownerUserId: USER,
      verificationLevel: 'unverified',
      publicStatus: 'published',
      createdAt: NOW,
    });
    await db.insert(resourceItemsTable).values({
      id: '21111111-2222-4333-8444-555555555531',
      resourceId: RESOURCE,
      name: 'Harina PAN',
      quantity: 7,
      category: 'food',
    });

    await db.insert(donationIntakesTable).values({
      id: INTAKE,
      emergencyId: EM,
      targetResourceId: RESOURCE,
      intakeCode: 'DON-0001',
      status: 'pending',
      donorName: 'Donante test',
      donorPhone: '+58 412 0000000',
      contactNormalized: 'donante-test',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await db.insert(donationIntakeLinesTable).values({
      id: '21111111-2222-4333-8444-555555555541',
      intakeId: INTAKE,
      name: 'AGUA Potable',
      quantity: 2,
      category: 'water',
    });

    await db.insert(containersTable).values({
      id: CONTAINER,
      emergencyId: EM,
      code: 'CAJ-0001',
      type: 'box',
      lines: [
        containerLine('AGUA Potable', null),
        containerLine('Harina PAN', null),
        containerLine('Pañales', SUPPLY_B),
      ],
      status: 'open',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('listUnlinked agrupa por texto crudo y fuente, ignorando las líneas ya enlazadas', async () => {
    const groups = await repo.listUnlinked();

    expect(groups).toEqual(
      expect.arrayContaining([
        { source: 'need_items', name: 'AGUA Potable', lines: 2 },
        { source: 'offer_items', name: 'agua embotellada', lines: 1 },
        { source: 'resource_items', name: 'Harina PAN', lines: 1 },
        { source: 'donation_intake_lines', name: 'AGUA Potable', lines: 1 },
        { source: 'container_lines', name: 'AGUA Potable', lines: 1 },
        { source: 'container_lines', name: 'Harina PAN', lines: 1 },
      ]),
    );
    // La línea de contenedor ya enlazada y la need_item manual no aparecen.
    expect(groups).toHaveLength(6);
  });

  it('applyLinks enlaza solo supply_id nulos por (fuente, texto exacto), incluidas las líneas jsonb', async () => {
    const updated = await repo.applyLinks([
      { source: 'need_items', name: 'AGUA Potable', supplyId: SUPPLY_A },
      { source: 'offer_items', name: 'agua embotellada', supplyId: SUPPLY_A },
      {
        source: 'donation_intake_lines',
        name: 'AGUA Potable',
        supplyId: SUPPLY_A,
      },
      { source: 'container_lines', name: 'AGUA Potable', supplyId: SUPPLY_A },
    ]);

    // 2 need_items + 1 offer_item + 1 intake_line + 1 línea de contenedor.
    expect(updated).toBe(5);

    const needLines = await db
      .select({
        supplyId: needItemsTable.supplyId,
        quantity: needItemsTable.quantity,
      })
      .from(needItemsTable);
    expect(
      needLines.filter((l) => l.supplyId === SUPPLY_A).map((l) => l.quantity),
    ).toEqual(expect.arrayContaining([3, 1]));
    // El enlace manual a SUPPLY_B sobrevive.
    expect(needLines.find((l) => l.quantity === 2)?.supplyId).toBe(SUPPLY_B);

    // resource_items no estaba en los parches: sigue sin enlazar.
    const [resourceLine] = await db
      .select({ supplyId: resourceItemsTable.supplyId })
      .from(resourceItemsTable);
    expect(resourceLine.supplyId).toBeNull();

    const [container] = await db
      .select({ lines: containersTable.lines })
      .from(containersTable)
      .where(eq(containersTable.id, CONTAINER));
    expect(container.lines).toEqual([
      expect.objectContaining({ name: 'AGUA Potable', supplyId: SUPPLY_A }),
      expect.objectContaining({ name: 'Harina PAN', supplyId: null }),
      expect.objectContaining({ name: 'Pañales', supplyId: SUPPLY_B }),
    ]);
  });

  it('re-ejecutar los mismos parches no actualiza nada (idempotencia)', async () => {
    const patches = [
      {
        source: 'need_items' as const,
        name: 'AGUA Potable',
        supplyId: SUPPLY_A,
      },
      {
        source: 'container_lines' as const,
        name: 'AGUA Potable',
        supplyId: SUPPLY_A,
      },
    ];

    const first = await repo.applyLinks(patches);
    const second = await repo.applyLinks(patches);

    expect(first).toBe(3);
    expect(second).toBe(0);
  });
});
