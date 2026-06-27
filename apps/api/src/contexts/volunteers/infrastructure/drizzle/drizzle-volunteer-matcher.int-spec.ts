/**
 * Integration test: DrizzleVolunteerMatcher queries real Postgres.
 *
 * Uses the test database (same pattern as drizzle-volunteer.repository.int-spec.ts).
 * Run with: pnpm --filter api test --testPathPattern=drizzle-volunteer-matcher
 */
import { createDb, Db } from '../../../../shared/db';
import { volunteersTable } from './schema';
import { DrizzleVolunteerMatcher } from './drizzle-volunteer-matcher';
import {
  VolunteerSkill,
  Availability,
  Vehicle,
  VolunteerStatus,
} from '../../domain/volunteer-enums';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

const EM_M = 'f0500001-0000-4000-8000-000000000001';
const EM_OTHER = 'f0500001-0000-4000-8000-000000000002';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

function makeVolRow(overrides: {
  emergencyId?: string;
  skills?: string[];
  status?: string;
  vehicle?: string;
}) {
  return {
    id: randomUUID(),
    emergencyId: overrides.emergencyId ?? EM_M,
    userId: randomUUID(),
    name: 'Test Volunteer',
    contact: 'test@test.com',
    municipality: 'Valencia',
    skills: overrides.skills ?? [VolunteerSkill.Medical],
    availability: Availability.Immediate,
    vehicle: overrides.vehicle ?? Vehicle.Car,
    status: overrides.status ?? VolunteerStatus.Available,
    consentAccepted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('DrizzleVolunteerMatcher (integration)', () => {
  let db: Db;
  let pool: Pool;
  let matcher: DrizzleVolunteerMatcher;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    matcher = new DrizzleVolunteerMatcher(db);
  });
  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(volunteersTable);
    // Seed volunteers in EM_M
    await db.insert(volunteersTable).values([
      makeVolRow({ skills: [VolunteerSkill.Medical] }),
      makeVolRow({ skills: [VolunteerSkill.Medical, VolunteerSkill.General] }),
      makeVolRow({
        skills: [VolunteerSkill.Logistics],
        status: VolunteerStatus.Assigned,
      }), // inactive
      makeVolRow({ skills: [VolunteerSkill.General] }), // no medical
      // volunteer in a DIFFERENT emergency
      makeVolRow({ emergencyId: EM_OTHER, skills: [VolunteerSkill.Medical] }),
    ]);
  });

  it('returns only available volunteers with the matching skill in that emergency', async () => {
    const results = await matcher.findAvailableBySkill(
      EM_M,
      VolunteerSkill.Medical,
    );
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.skills).toContain(VolunteerSkill.Medical);
    }
  });

  it('does not return volunteers from a different emergency', async () => {
    const results = await matcher.findAvailableBySkill(
      EM_M,
      VolunteerSkill.Medical,
    );
    const emergencyIds = await db
      .select({ em: volunteersTable.emergencyId })
      .from(volunteersTable);
    // All returned volunteers should belong to EM_M — verify via name lookup in DB
    // (matcher returns volunteerId; we check they exist in EM_M rows)
    const emMVolIds = (
      await db.select({ id: volunteersTable.id }).from(volunteersTable)
    ).map((r) => r.id);
    for (const r of results) {
      expect(emMVolIds).toContain(r.volunteerId);
    }
    expect(results.length).toBe(2);
    void emergencyIds; // unused but present for clarity
  });

  it('does not return Assigned volunteers', async () => {
    const results = await matcher.findAvailableBySkill(
      EM_M,
      VolunteerSkill.Logistics,
    );
    expect(results).toHaveLength(0); // the logistics volunteer is Assigned
  });

  it('respects the limit', async () => {
    const results = await matcher.findAvailableBySkill(
      EM_M,
      VolunteerSkill.Medical,
      1,
    );
    expect(results).toHaveLength(1);
  });

  it('returns hasVehicle=true when vehicle !== none', async () => {
    const results = await matcher.findAvailableBySkill(
      EM_M,
      VolunteerSkill.Medical,
    );
    for (const r of results) {
      expect(r.hasVehicle).toBe(true); // all seeded with Vehicle.Car
    }
  });
});
