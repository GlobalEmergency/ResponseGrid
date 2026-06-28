import { createDb, Db } from '../../../../shared/db';
import { shipmentsTable } from './schema';
import { DrizzleShipmentRepository } from './drizzle-shipment.repository';
import { DrizzleShipmentAuthorizationLookup } from './drizzle-shipment-authorization-lookup';
import { Shipment } from '../../domain/shipment';
import { ShipmentId } from '../../domain/shipment-id';
import { ShipmentItem } from '../../domain/shipment-item';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '44444444-4444-4444-8444-444444444444';
const OTHER_EM = '55555555-5555-4555-8555-555555555555';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeShipment(opts?: {
  emergencyId?: string;
  items?: ShipmentItem[];
  manifest?: string | null;
}): Shipment {
  return Shipment.create({
    id: ShipmentId.create(),
    emergencyId: EmergencyId.fromString(opts?.emergencyId ?? EM),
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    items: opts?.items ?? [
      ShipmentItem.create({
        description: 'agua',
        quantity: 5,
        unit: 'cajas',
        category: 'alimentacion',
      }),
    ],
    manifest: opts?.manifest ?? 'Manifiesto',
  });
}

describe('DrizzleShipmentRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleShipmentRepository;
  let lookup: DrizzleShipmentAuthorizationLookup;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleShipmentRepository(db);
    lookup = new DrizzleShipmentAuthorizationLookup(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(shipmentsTable);
  });

  it('round-trips a planned shipment (jsonb items, no carrier) through Postgres', async () => {
    const s = makeShipment({
      items: [
        ShipmentItem.create({ description: 'mantas', quantity: 20 }),
        ShipmentItem.create({ description: 'varios' }),
      ],
    });
    await repo.save(s);
    const found = await repo.findById(s.id);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(s.id.value);
    expect(found!.status).toBe(ShipmentStatus.Planned);
    expect(found!.originResourceId).toBe(ORIGIN);
    expect(found!.destinationResourceId).toBe(DEST);
    expect(found!.items).toHaveLength(2);
    expect(found!.items[0].description).toBe('mantas');
    expect(found!.items[0].quantity).toBe(20);
    expect(found!.items[1].quantity).toBeNull();
    expect(found!.assignedCapacityId).toBeNull();
    expect(found!.carrier).toBeNull();
    // createdAt comes back as a real Date (typed query builder).
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it('persists assignment via upsert (capacity + carrier + status)', async () => {
    const s = makeShipment();
    await repo.save(s);

    s.assignCapacity(CAPACITY, {
      type: CarrierType.Organization,
      id: CARRIER_ID,
    });
    await repo.save(s);

    const found = await repo.findById(s.id);
    expect(found!.status).toBe(ShipmentStatus.Assigned);
    expect(found!.assignedCapacityId).toBe(CAPACITY);
    expect(found!.carrier).toEqual({
      type: CarrierType.Organization,
      id: CARRIER_ID,
    });
  });

  it('findByEmergency filters by status, newest first', async () => {
    const planned = makeShipment();
    await repo.save(planned);
    const assigned = makeShipment();
    assigned.assignCapacity(CAPACITY, {
      type: CarrierType.Volunteer,
      id: CARRIER_ID,
    });
    await repo.save(assigned);

    const onlyAssigned = await repo.findByEmergency(
      EmergencyId.fromString(EM),
      { status: ShipmentStatus.Assigned },
    );
    expect(onlyAssigned).toHaveLength(1);
    expect(onlyAssigned[0].id.value).toBe(assigned.id.value);

    const all = await repo.findByEmergency(EmergencyId.fromString(EM), {});
    expect(all).toHaveLength(2);
  });

  it('findByCarrier returns the carrier shipments, optionally scoped by emergency', async () => {
    const a = makeShipment();
    a.assignCapacity(CAPACITY, { type: CarrierType.Volunteer, id: CARRIER_ID });
    await repo.save(a);
    const b = makeShipment({ emergencyId: OTHER_EM });
    b.assignCapacity(CAPACITY, { type: CarrierType.Volunteer, id: CARRIER_ID });
    await repo.save(b);

    const all = await repo.findByCarrier(CARRIER_ID, null);
    expect(all).toHaveLength(2);

    const scoped = await repo.findByCarrier(
      CARRIER_ID,
      EmergencyId.fromString(EM),
    );
    expect(scoped).toHaveLength(1);
    expect(scoped[0].emergencyId.value).toBe(EM);
  });

  it('authorization lookup resolves emergency + carrier (and null for unknown)', async () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, { type: CarrierType.Volunteer, id: CARRIER_ID });
    await repo.save(s);

    const facts = await lookup.findAuthorizationFacts(s.id.value);
    expect(facts).toEqual({ emergencyId: EM, carrierId: CARRIER_ID });

    const missing = await lookup.findAuthorizationFacts(
      '99999999-9999-4999-8999-999999999999',
    );
    expect(missing).toBeNull();
  });
});
