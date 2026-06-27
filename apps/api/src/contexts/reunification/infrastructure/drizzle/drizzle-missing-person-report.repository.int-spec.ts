import { createDb, Db } from '../../../../shared/db';
import { missingPersonReportsTable, sightingsTable } from './schema';
import { DrizzleMissingPersonReportRepository } from './drizzle-missing-person-report.repository';
import { MissingPersonReport } from '../../domain/missing-person-report';
import { MissingPersonReportId } from '../../domain/missing-person-report-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { MissingPersonStatus } from '../../domain/missing-person-status';
import { SightingId } from '../../domain/sighting-id';
import type { Pool } from 'pg';

const EM = 'dddddddd-0000-4000-8000-000000000001';
const USER_A = 'dddddddd-0000-4000-8000-000000000010';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

function makeReport(opts?: { documentId?: string; userId?: string }) {
  return MissingPersonReport.create({
    id: MissingPersonReportId.create(),
    emergencyId: EmergencyId.fromString(EM),
    person: {
      firstName: 'María',
      lastName: 'García',
      documentId: opts?.documentId ?? null,
      approximateAge: 40,
      lastKnownLocation: 'Calle Mayor 10',
      lastKnownCoords: null,
      description: null,
    },
    reporter: {
      userId: opts?.userId ?? null,
      name: 'Juan García',
      phone: '+34600123456',
      email: null,
    },
    consentGiven: true,
  });
}

describe('DrizzleMissingPersonReportRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleMissingPersonReportRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleMissingPersonReportRepository(db);
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await db.delete(sightingsTable);
    await db.delete(missingPersonReportsTable);
  });

  it('round-trips a report through Postgres', async () => {
    const report = makeReport({ documentId: 'ABC123' });
    await repo.save(report);

    const found = await repo.findById(report.id);
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(report.id.value);
    expect(found!.person.documentId).toBe('ABC123');
    expect(found!.status).toBe(MissingPersonStatus.Open);
  });

  it('round-trips a report with sightings', async () => {
    const report = makeReport();
    await repo.save(report);

    const loaded = await repo.findById(report.id);
    loaded!.addSighting({
      id: SightingId.create(),
      reportedByUserId: USER_A,
      reportedByName: null,
      location: 'Plaza Mayor',
      coords: null,
      note: 'Avistado en la plaza',
    });
    await repo.save(loaded!);

    const withSighting = await repo.findById(report.id);
    expect(withSighting!.sightings).toHaveLength(1);
    expect(withSighting!.sightings[0].location).toBe('Plaza Mayor');
  });

  it('finds by emergencyId and status filter', async () => {
    const r1 = makeReport();
    const r2 = makeReport();
    await repo.save(r1);
    await repo.save(r2);

    // Close r2
    const loaded = await repo.findById(r2.id);
    loaded!.updateStatus(MissingPersonStatus.Closed, USER_A);
    await repo.save(loaded!);

    const openReports = await repo.findByEmergency(EM, {
      status: MissingPersonStatus.Open,
    });
    expect(openReports).toHaveLength(1);
    expect(openReports[0].id.value).toBe(r1.id.value);
  });

  it('finds by documentId for cross-matching', async () => {
    const r1 = makeReport({ documentId: 'XYZ999' });
    const r2 = makeReport({ documentId: 'OTHER' });
    await repo.save(r1);
    await repo.save(r2);

    const results = await repo.findByDocumentId(EM, 'XYZ999');
    expect(results).toHaveLength(1);
    expect(results[0].person.documentId).toBe('XYZ999');
  });

  it('findEmergencyId returns the correct emergencyId', async () => {
    const report = makeReport();
    await repo.save(report);
    const emergencyId = await repo.findEmergencyId(report.id.value);
    expect(emergencyId).toBe(EM);
  });

  it('returns null for non-existent report', async () => {
    const result = await repo.findById(MissingPersonReportId.create());
    expect(result).toBeNull();
  });
});
