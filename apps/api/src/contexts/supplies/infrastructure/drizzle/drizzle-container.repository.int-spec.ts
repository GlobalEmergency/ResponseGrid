import { createDb, Db } from '../../../../shared/db';
import { containerCodeSequencesTable, containersTable } from './schema';
import { DrizzleContainerRepository } from './drizzle-container.repository';
import { DrizzleContainerAuthorizationLookup } from './drizzle-container-authorization-lookup';
import { Container } from '../../domain/container';
import { ContainerId } from '../../domain/container-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../../domain/container-enums';
import { SupplyLine } from '../../domain/supply-line';
import { Category } from '../../domain/category';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '66666666-6666-4666-8666-666666666666';
const OTHER_EM = '77777777-7777-4777-8777-777777777777';
const RESOURCE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SHIPMENT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeContainer(opts?: {
  emergencyId?: string;
  code?: string;
  type?: ContainerType;
  lines?: SupplyLine[];
  grossWeightKg?: number | null;
  holder?: { type: ContainerHolderType; id: string } | null;
}): Container {
  return Container.create({
    id: ContainerId.create(),
    code: opts?.code ?? 'PAL-0001',
    type: opts?.type ?? ContainerType.Pallet,
    emergencyId: EmergencyId.fromString(opts?.emergencyId ?? EM),
    lines: opts?.lines ?? [],
    grossWeightKg: opts?.grossWeightKg ?? null,
    holder: opts?.holder ?? null,
  });
}

describe('DrizzleContainerRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleContainerRepository;
  let lookup: DrizzleContainerAuthorizationLookup;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleContainerRepository(db);
    lookup = new DrizzleContainerAuthorizationLookup(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(containersTable);
    await db.delete(containerCodeSequencesTable);
  });

  it('round-trips a container (jsonb lines, holder, weight) through Postgres', async () => {
    const c = makeContainer({
      code: 'CAJ-0001',
      type: ContainerType.Box,
      grossWeightKg: 18.5,
      lines: [
        SupplyLine.create({
          name: 'Agua',
          quantity: 24,
          unit: 'botellas',
          category: Category.Water,
        }),
      ],
      holder: { type: ContainerHolderType.Resource, id: RESOURCE },
    });
    await repo.save(c);

    const found = await repo.findById(c.id);
    expect(found).not.toBeNull();
    expect(found!.code).toBe('CAJ-0001');
    expect(found!.type).toBe(ContainerType.Box);
    expect(found!.grossWeightKg).toBe(18.5);
    expect(found!.lines).toHaveLength(1);
    expect(found!.lines[0].name).toBe('Agua');
    expect(found!.holder).toEqual({
      type: ContainerHolderType.Resource,
      id: RESOURCE,
    });
    expect(found!.status).toBe(ContainerStatus.Open);
    // typed query builder → real Date, not a string
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it('persists nesting, sealing and a holder move via upsert', async () => {
    const pallet = makeContainer({ code: 'PAL-0001' });
    const box = makeContainer({ code: 'CAJ-0001', type: ContainerType.Box });
    await repo.save(pallet);
    await repo.save(box);

    box.setParent(pallet.id);
    box.seal();
    box.moveToHolder({ type: ContainerHolderType.Shipment, id: SHIPMENT });
    await repo.save(box);

    const found = await repo.findById(box.id);
    expect(found!.parentContainerId?.value).toBe(pallet.id.value);
    expect(found!.status).toBe(ContainerStatus.Sealed);
    expect(found!.holder).toEqual({
      type: ContainerHolderType.Shipment,
      id: SHIPMENT,
    });

    const children = await repo.findChildren(pallet.id);
    expect(children).toHaveLength(1);
    expect(children[0].id.value).toBe(box.id.value);
  });

  it('nextSequence allocates a monotonic per-(emergency, type) sequence, never reused', async () => {
    const em = EmergencyId.fromString(EM);
    // increments on every call, independent of how many rows exist
    expect(await repo.nextSequence(em, ContainerType.Pallet)).toBe(1);
    expect(await repo.nextSequence(em, ContainerType.Pallet)).toBe(2);
    // a different type and a different emergency keep their own sequence
    expect(await repo.nextSequence(em, ContainerType.Box)).toBe(1);
    expect(
      await repo.nextSequence(
        EmergencyId.fromString(OTHER_EM),
        ContainerType.Pallet,
      ),
    ).toBe(1);
    // deleting containers does NOT free a code for reuse — the sequence is
    // monotonic, decoupled from the live row count.
    await repo.save(makeContainer({ code: 'PAL-0003' }));
    await db.delete(containersTable);
    expect(await repo.nextSequence(em, ContainerType.Pallet)).toBe(3);
  });

  it('findByEmergency filters by type/status/holder/top-level, newest first', async () => {
    const pallet = makeContainer({
      code: 'PAL-0001',
      holder: { type: ContainerHolderType.Shipment, id: SHIPMENT },
    });
    await repo.save(pallet);
    const box = makeContainer({ code: 'CAJ-0001', type: ContainerType.Box });
    box.setParent(pallet.id);
    box.seal();
    await repo.save(box);

    const em = EmergencyId.fromString(EM);
    expect(await repo.findByEmergency(em, {})).toHaveLength(2);
    expect(
      await repo.findByEmergency(em, { type: ContainerType.Box }),
    ).toHaveLength(1);
    expect(
      await repo.findByEmergency(em, { status: ContainerStatus.Sealed }),
    ).toHaveLength(1);
    expect(await repo.findByEmergency(em, { topLevelOnly: true })).toHaveLength(
      1,
    );
    const inShipment = await repo.findByEmergency(em, {
      holderType: ContainerHolderType.Shipment,
      holderId: SHIPMENT,
    });
    expect(inShipment).toHaveLength(1);
    expect(inShipment[0].id.value).toBe(pallet.id.value);
  });

  it('authorization lookup resolves the emergency (and null for unknown)', async () => {
    const c = makeContainer();
    await repo.save(c);
    expect(await lookup.findAuthorizationFacts(c.id.value)).toEqual({
      emergencyId: EM,
    });
    expect(
      await lookup.findAuthorizationFacts(
        '00000000-0000-4000-8000-000000000000',
      ),
    ).toBeNull();
  });
});
