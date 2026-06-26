import { createDb, Db } from '../../../../shared/db';
import { emergenciesTable } from './schema';
import { DrizzleEmergencyRepository } from './drizzle-emergency.repository';
import { Emergency } from '../../domain/emergency';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Slug } from '../../domain/slug';
import { EmergencyStatus } from '../../domain/emergency-status';
import type { Pool } from 'pg';

const URL = process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const SEED_ID = '11111111-1111-4111-8111-111111111111';

describe('DrizzleEmergencyRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleEmergencyRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleEmergencyRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(emergenciesTable);
  });

  it('round-trips an Emergency through Postgres (save + findById)', async () => {
    const emergency = Emergency.create({
      id: EmergencyId.fromString(SEED_ID),
      name: 'Emergencia sísmica — Venezuela',
      slug: Slug.fromString('venezuela'),
      country: 'VE',
    });

    await repo.save(emergency);
    const found = await repo.findById(emergency.id);

    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(SEED_ID);
    expect(found?.name).toBe('Emergencia sísmica — Venezuela');
    expect(found?.slug.value).toBe('venezuela');
    expect(found?.country).toBe('VE');
    expect(found?.status).toBe(EmergencyStatus.Active);
  });

  it('findBySlug returns the correct emergency', async () => {
    const emergency = Emergency.create({
      id: EmergencyId.fromString(SEED_ID),
      name: 'Emergencia sísmica — Venezuela',
      slug: Slug.fromString('venezuela'),
      country: 'VE',
    });

    await repo.save(emergency);
    const found = await repo.findBySlug(Slug.fromString('venezuela'));

    expect(found).not.toBeNull();
    expect(found?.slug.value).toBe('venezuela');
  });

  it('findBySlug returns null when absent', async () => {
    const result = await repo.findBySlug(Slug.fromString('non-existent'));
    expect(result).toBeNull();
  });

  it('listActive returns only active emergencies (not closed)', async () => {
    const active = Emergency.create({
      id: EmergencyId.fromString(SEED_ID),
      name: 'Active Emergency',
      slug: Slug.fromString('active-emergency'),
      country: 'VE',
    });

    const closed = Emergency.create({
      id: EmergencyId.fromString('22222222-2222-4222-8222-222222222222'),
      name: 'Closed Emergency',
      slug: Slug.fromString('closed-emergency'),
      country: 'CO',
    });
    closed.close();

    await repo.save(active);
    await repo.save(closed);

    const result = await repo.listActive();
    expect(result).toHaveLength(1);
    expect(result[0].slug.value).toBe('active-emergency');
    expect(result[0].status).toBe(EmergencyStatus.Active);
  });
});
