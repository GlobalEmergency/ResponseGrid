import { createDb, Db } from '../../../../shared/db';
import {
  donationIntakeLinesTable,
  donationIntakesTable,
} from './donation-intake-schema';
import { DrizzleDonationIntakeRepository } from './drizzle-donation-intake.repository';
import { DonationIntake } from '../../domain/donation-intake';
import { DonationIntakeId } from '../../domain/donation-intake-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category } from '../../domain/offer-enums';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '55555555-5555-4555-8555-555555555555';
const RESOURCE = '66666666-6666-4666-8666-666666666666';
const VOL_USER = '77777777-7777-4777-8777-777777777777';

function makeIntake(code: string) {
  return DonationIntake.create({
    id: DonationIntakeId.create(),
    emergencyId: EmergencyId.fromString(EM),
    targetResourceId: RESOURCE,
    intakeCode: code,
    donor: {
      donorName: 'Pedro Test',
      donorPhone: '+58 412 1234567',
      donorEmail: null,
    },
    donorUserId: null,
    lines: [
      {
        sortOrder: 0,
        line: {
          category: Category.Food,
          name: 'Harina',
          quantity: 4,
          unit: 'sacos',
          presentation: null,
          expiresAt: '2026-07-01',
        },
      },
    ],
  });
}

describe('DrizzleDonationIntakeRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleDonationIntakeRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleDonationIntakeRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(donationIntakeLinesTable);
    await db.delete(donationIntakesTable);
  });

  it('round-trips an intake with lines through Postgres', async () => {
    const intake = makeIntake('ACO-TEST');
    await repo.save(intake);

    const found = await repo.findById(intake.id);
    expect(found).not.toBeNull();
    if (!found) return;
    expect(found.intakeCode).toBe('ACO-TEST');
    expect(found.lines).toHaveLength(1);
    expect(found.lines[0]?.supplyLine.name).toBe('Harina');
    expect(found.lines[0]?.supplyLine.expiresAt).toBe('2026-07-01');
  });

  it('updates lines on save (replace)', async () => {
    const intake = makeIntake('ACO-UPD1');
    await repo.save(intake);
    intake.updateContent(
      {
        donorName: 'Pedro Actualizado',
        donorPhone: '+58 412 1234567',
        donorEmail: 'pedro@test.com',
      },
      [
        {
          sortOrder: 0,
          line: {
            category: Category.Water,
            name: 'Agua',
            quantity: 2,
            unit: null,
            presentation: null,
            expiresAt: '2026-07-02',
          },
        },
        {
          sortOrder: 1,
          line: {
            category: Category.Food,
            name: 'Arroz',
            quantity: 1,
            unit: null,
            presentation: null,
            expiresAt: null,
          },
        },
      ],
    );
    await repo.save(intake);

    const found = await repo.findById(intake.id);
    expect(found).not.toBeNull();
    if (!found) return;
    expect(found.donorEmail).toBe('pedro@test.com');
    expect(found.lines).toHaveLength(2);
    expect(found.lines[0]?.supplyLine.expiresAt).toBe('2026-07-02');
  });

  it('searches by phone partial and exact code', async () => {
    const intake = makeIntake('ACO-SRCH');
    await repo.save(intake);

    const byPhone = await repo.search(EmergencyId.fromString(EM), '123456');
    expect(byPhone.some((i) => i.id.equals(intake.id))).toBe(true);

    const byCode = await repo.search(EmergencyId.fromString(EM), 'ACO-SRCH');
    expect(byCode).toHaveLength(1);
  });

  it('lists pending by resource ordered oldest first', async () => {
    const older = makeIntake('ACO-OLD1');
    await repo.save(older);
    await new Promise((r) => setTimeout(r, 5));
    const newer = makeIntake('ACO-NEW1');
    await repo.save(newer);

    const pending = await repo.findPendingByResource(RESOURCE);
    expect(pending).toHaveLength(2);
    expect(pending[0]?.intakeCode).toBe('ACO-OLD1');
  });

  it('finds pending by normalized contact', async () => {
    const intake = makeIntake('ACO-CNT1');
    await repo.save(intake);
    const pending = await repo.findPendingByContact(
      EmergencyId.fromString(EM),
      '584121234567',
    );
    expect(pending).toHaveLength(1);

    intake.confirmReception(VOL_USER, null, null);
    await repo.save(intake);
    const after = await repo.findPendingByContact(
      EmergencyId.fromString(EM),
      '584121234567',
    );
    expect(after).toHaveLength(0);
  });

  it('existsCode returns true when code is taken', async () => {
    await repo.save(makeIntake('ACO-DUP1'));
    const exists = await repo.existsCode(
      EmergencyId.fromString(EM),
      'ACO-DUP1',
    );
    expect(exists).toBe(true);
  });
});
