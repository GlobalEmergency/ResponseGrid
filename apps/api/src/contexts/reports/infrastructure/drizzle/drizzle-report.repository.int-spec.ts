import 'dotenv/config';
import { createDb } from '../../../../shared/db';
import { DrizzleReportRepository } from './drizzle-report.repository';
import { Report } from '../../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../../domain/report-enums';
import { reportsTable } from './schema';

const TEST_URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub_test';

describe('DrizzleReportRepository (int-spec)', () => {
  const { db, pool } = createDb(TEST_URL);
  const repo = new DrizzleReportRepository(db);

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await db.delete(reportsTable);
  });

  it('saves and retrieves a report by id', async () => {
    const report = Report.create({
      emergencyId: '11111111-1111-4111-8111-111111111111',
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Incident,
      note: 'Test note',
      priority: ReportPriority.High,
    });
    await repo.save(report);
    const found = await repo.findById(report.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(report.id);
    expect(found!.note).toBe('Test note');
    expect(found!.status).toBe(ReportStatus.Open);
  });

  it('updates status on save when already exists', async () => {
    const report = Report.create({
      emergencyId: '11111111-1111-4111-8111-111111111111',
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Stock,
      note: 'Low supplies',
      priority: ReportPriority.Medium,
    });
    await repo.save(report);
    report.markReviewed();
    await repo.save(report);
    const found = await repo.findById(report.id);
    expect(found!.status).toBe(ReportStatus.Reviewed);
    expect(found!.reviewedAt).not.toBeNull();
  });

  it('returns null for unknown id', async () => {
    const found = await repo.findById('ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(found).toBeNull();
  });

  it('findByEmergencyId returns all reports for that emergency', async () => {
    const EM = '22222222-2222-4222-8222-222222222222';
    const r1 = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Incident,
      note: 'A',
      priority: ReportPriority.High,
    });
    const r2 = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.Other,
      note: 'B',
      priority: ReportPriority.Low,
    });
    const r3 = Report.create({
      emergencyId: '33333333-3333-4333-8333-333333333333',
      reporterUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      type: ReportType.Stock,
      note: 'C',
      priority: ReportPriority.Low,
    });
    await Promise.all([repo.save(r1), repo.save(r2), repo.save(r3)]);
    const results = await repo.findByEmergencyId(EM);
    expect(results).toHaveLength(2);
  });

  it('filters by priority', async () => {
    const EM = '44444444-4444-4444-8444-444444444444';
    const r1 = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Other,
      note: 'Urgent',
      priority: ReportPriority.Urgent,
    });
    const r2 = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.Other,
      note: 'Low',
      priority: ReportPriority.Low,
    });
    await Promise.all([repo.save(r1), repo.save(r2)]);
    const results = await repo.findByEmergencyId(EM, {
      priority: ReportPriority.Urgent,
    });
    expect(results).toHaveLength(1);
    expect(results[0].priority).toBe(ReportPriority.Urgent);
  });

  it('findByEmergencyIdAndReporter returns only that user reports', async () => {
    const EM = '55555555-5555-4555-8555-555555555555';
    const r1 = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Incident,
      note: 'Mine',
      priority: ReportPriority.High,
    });
    const r2 = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.Other,
      note: 'Theirs',
      priority: ReportPriority.Low,
    });
    await Promise.all([repo.save(r1), repo.save(r2)]);
    const results = await repo.findByEmergencyIdAndReporter(
      EM,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(results).toHaveLength(1);
    expect(results[0].note).toBe('Mine');
  });

  it('filters findByEmergencyId by type', async () => {
    const EM = '99999999-9999-4999-8999-999999999999';
    const stock = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.Stock,
      note: 'Stock',
      priority: ReportPriority.High,
    });
    const incident = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.Incident,
      note: 'Incident',
      priority: ReportPriority.Low,
    });
    await Promise.all([repo.save(stock), repo.save(incident)]);

    const results = await repo.findByEmergencyId(EM, {
      type: ReportType.Stock,
    });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(ReportType.Stock);
  });
});
