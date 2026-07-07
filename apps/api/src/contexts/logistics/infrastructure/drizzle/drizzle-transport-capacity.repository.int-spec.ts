import { createDb, Db } from '../../../../shared/db';
import { transportCapacitiesTable } from './schema';
import { DrizzleTransportCapacityRepository } from './drizzle-transport-capacity.repository';
import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '@globalemergency/warehouse-core/logistics';
import { Capacity } from '@globalemergency/warehouse-core/logistics';
import { Coverage } from '@globalemergency/warehouse-core/logistics';
import { CapacityWindow } from '@globalemergency/warehouse-core/logistics';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '44444444-4444-4444-8444-444444444444';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGIN_RES = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST_RES = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeCapacity(opts?: {
  mode?: TransportMode;
  coverage?: Coverage;
  capacity?: Capacity;
  window?: CapacityWindow;
  constraints?: string[];
}): TransportCapacity {
  return TransportCapacity.publish({
    id: TransportCapacityId.create(),
    scopeId: ScopeId.fromString(EM),
    provider: { type: TransportProviderType.Organization, id: PROVIDER_ID },
    mode: opts?.mode ?? TransportMode.Road,
    capacity:
      opts?.capacity ?? Capacity.create({ weightKg: 1200, volumeM3: 10 }),
    coverage:
      opts?.coverage ??
      Coverage.corridor({
        originResourceId: ORIGIN_RES,
        destinationResourceId: DEST_RES,
        originLat: null,
        originLng: null,
        destinationLat: null,
        destinationLng: null,
      }),
    window: opts?.window ?? CapacityWindow.empty(),
    constraints: opts?.constraints ?? ['refrigerated'],
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

  it('round-trips a corridor capacity through Postgres', async () => {
    const cap = makeCapacity({
      window: CapacityWindow.create({ from: '2026-07-01T00:00:00Z', to: null }),
    });
    await repo.save(cap);
    const found = await repo.findById(cap.id);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(cap.id.value);
    expect(found!.status).toBe(TransportCapacityStatus.Available);
    expect(found!.provider.type).toBe(TransportProviderType.Organization);
    expect(found!.provider.id).toBe(PROVIDER_ID);
    expect(found!.mode).toBe(TransportMode.Road);
    expect(found!.capacity.weightKg).toBe(1200);
    expect(found!.capacity.volumeM3).toBe(10);
    expect(found!.coverage.kind).toBe('corridor');
    expect(found!.window.from).toBe('2026-07-01T00:00:00.000Z');
    expect(found!.window.to).toBeNull();
    expect(found!.constraints).toEqual(['refrigerated']);
    // createdAt/updatedAt come back as real Dates (typed query builder).
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it('round-trips an area capacity with weight-only and no constraints', async () => {
    const cap = makeCapacity({
      coverage: Coverage.area('Estado Vargas'),
      capacity: Capacity.create({ weightKg: 800, volumeM3: null }),
      constraints: [],
    });
    await repo.save(cap);
    const found = await repo.findById(cap.id);

    expect(found!.coverage.kind).toBe('area');
    const plain = found!.coverage.toPlain();
    expect(plain.kind === 'area' && plain.area).toBe('Estado Vargas');
    expect(found!.capacity.weightKg).toBe(800);
    expect(found!.capacity.volumeM3).toBeNull();
    expect(found!.constraints).toEqual([]);
  });

  it('save() updates status on upsert (withdraw)', async () => {
    const cap = makeCapacity();
    await repo.save(cap);

    cap.withdraw();
    await repo.save(cap);

    const found = await repo.findById(cap.id);
    expect(found!.status).toBe(TransportCapacityStatus.Withdrawn);
  });

  it('findByScope filters by mode', async () => {
    await repo.save(makeCapacity({ mode: TransportMode.Road }));
    await repo.save(
      makeCapacity({ mode: TransportMode.Air, coverage: Coverage.area('Hub') }),
    );

    const result = await repo.findByScope(ScopeId.fromString(EM), {
      mode: TransportMode.Air,
    });
    expect(result).toHaveLength(1);
    expect(result[0].mode).toBe(TransportMode.Air);
  });

  it('findByScope filters by status', async () => {
    await repo.save(makeCapacity());
    const withdrawn = makeCapacity({ coverage: Coverage.area('X') });
    withdrawn.withdraw();
    await repo.save(withdrawn);

    const result = await repo.findByScope(ScopeId.fromString(EM), {
      status: TransportCapacityStatus.Available,
    });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(TransportCapacityStatus.Available);
  });

  it('findByScope filters by window overlap', async () => {
    await repo.save(
      makeCapacity({
        window: CapacityWindow.create({
          from: '2026-07-01T00:00:00Z',
          to: '2026-07-31T00:00:00Z',
        }),
      }),
    );
    await repo.save(
      makeCapacity({
        coverage: Coverage.area('Aug'),
        window: CapacityWindow.create({
          from: '2026-08-01T00:00:00Z',
          to: '2026-08-31T00:00:00Z',
        }),
      }),
    );

    const result = await repo.findByScope(ScopeId.fromString(EM), {
      availableFrom: '2026-07-05T00:00:00Z',
      availableTo: '2026-07-10T00:00:00Z',
    });
    expect(result).toHaveLength(1);
    expect(result[0].window.from).toBe('2026-07-01T00:00:00.000Z');
  });

  it('findByScope includes open-ended windows in any range', async () => {
    await repo.save(makeCapacity({ window: CapacityWindow.empty() }));

    const result = await repo.findByScope(ScopeId.fromString(EM), {
      availableFrom: '2030-01-01T00:00:00Z',
      availableTo: '2030-12-31T00:00:00Z',
    });
    expect(result).toHaveLength(1);
  });
});
