import { createDb, Db } from '../../../../shared/db';
import { transportCapacitiesTable } from './schema';
import { DrizzleTransportCapacityRepository } from './drizzle-transport-capacity.repository';
import { TransportCapacity } from '../../domain/transport-capacity';
import { TransportCapacityId } from '../../domain/transport-capacity-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from '../../domain/transport-capacity-enums';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '44444444-4444-4444-8444-444444444444';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeCapacity(overrides?: { mode?: TransportMode }) {
  return TransportCapacity.create({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    providerType: ProviderType.Organization,
    providerId: PROVIDER_ID,
    mode: overrides?.mode ?? TransportMode.Road,
    weightKg: 1000,
    volumeM3: null,
    originMunicipality: 'Caracas',
    destinationMunicipality: 'Valencia',
    availableFrom: new Date('2026-07-01T08:00:00.000Z'),
    availableUntil: null,
    refrigerated: false,
    notes: null,
  });
}

describe('DrizzleTransportCapacityRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleTransportCapacityRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleTransportCapacityRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(transportCapacitiesTable);
  });

  it('round-trips a capacity through Postgres', async () => {
    const cap = makeCapacity();
    await repo.save(cap);
    const found = await repo.findById(cap.id);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(cap.id.value);
    expect(found!.status).toBe(CapacityStatus.Available);
    expect(found!.providerType).toBe(ProviderType.Organization);
    expect(found!.providerId).toBe(PROVIDER_ID);
    expect(found!.mode).toBe(TransportMode.Road);
    expect(found!.weightKg).toBe(1000);
    expect(found!.volumeM3).toBeNull();
    expect(found!.originMunicipality).toBe('Caracas');
    expect(found!.destinationMunicipality).toBe('Valencia');
    expect(found!.refrigerated).toBe(false);
    expect(found!.notes).toBeNull();
  });

  it('save() updates status on upsert (withdraw)', async () => {
    const cap = makeCapacity();
    await repo.save(cap);
    cap.withdraw();
    await repo.save(cap);
    const found = await repo.findById(cap.id);
    expect(found!.status).toBe(CapacityStatus.Withdrawn);
  });

  it('findByEmergency filters by mode and status', async () => {
    const road = makeCapacity({ mode: TransportMode.Road });
    const air = makeCapacity({ mode: TransportMode.Air });
    air.withdraw();
    await repo.save(road);
    await repo.save(air);

    const byMode = await repo.findByEmergency(EmergencyId.fromString(EM), {
      mode: TransportMode.Road,
    });
    expect(byMode).toHaveLength(1);
    expect(byMode[0].mode).toBe(TransportMode.Road);

    const available = await repo.findByEmergency(EmergencyId.fromString(EM), {
      status: CapacityStatus.Available,
    });
    expect(available).toHaveLength(1);
    expect(available[0].mode).toBe(TransportMode.Road);

    const all = await repo.findByEmergency(EmergencyId.fromString(EM));
    expect(all).toHaveLength(2);
  });
});
