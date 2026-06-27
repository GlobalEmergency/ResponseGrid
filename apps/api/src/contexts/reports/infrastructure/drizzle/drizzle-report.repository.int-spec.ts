import 'dotenv/config';
import { createDb } from '../../../../shared/db';
import { DrizzleReportRepository } from './drizzle-report.repository';
import { Report } from '../../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
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

  it('round-trips structural SAR fields', async () => {
    const EM = '66666666-6666-4666-8666-666666666666';
    const report = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'Hospital damaged',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Severe,
        trappedPersonsEstimate: 5,
        accessibleForRescue: true,
        buildingType: 'hospital',
      },
    });
    await repo.save(report);
    const found = await repo.findById(report.id);
    expect(found!.damageLevel).toBe(DamageLevel.Severe);
    expect(found!.trappedPersonsEstimate).toBe(5);
    expect(found!.accessibleForRescue).toBe(true);
    expect(found!.buildingType).toBe('hospital');
  });

  it('round-trips publishedAt and publishNote after publish()', async () => {
    const EM = '77777777-7777-4777-8777-777777777777';
    const report = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'School damaged',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Moderate,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    await repo.save(report);
    report.markReviewed();
    await repo.save(report);
    report.publish('Verified by SAR coordinator');
    await repo.save(report);
    const found = await repo.findById(report.id);
    expect(found!.status).toBe(ReportStatus.Published);
    expect(found!.publishNote).toBe('Verified by SAR coordinator');
    expect(found!.publishedAt).not.toBeNull();
  });

  it('findPublishedStructuralByEmergencyId returns only published structural reports', async () => {
    const EM = '88888888-8888-4888-8888-888888888888';
    const published = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'Published one',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Severe,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    published.markReviewed();
    published.publish('All clear');

    const openStructural = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.StructuralDamage,
      note: 'Still open',
      priority: ReportPriority.Medium,
      structuralDetail: {
        damageLevel: DamageLevel.Moderate,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });

    const nonStructural = Report.create({
      emergencyId: EM,
      reporterUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      type: ReportType.Incident,
      note: 'Incident',
      priority: ReportPriority.Low,
    });

    await Promise.all([
      repo.save(published),
      repo.save(openStructural),
      repo.save(nonStructural),
    ]);

    const results = await repo.findPublishedStructuralByEmergencyId(EM);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(published.id);
    expect(results[0].status).toBe(ReportStatus.Published);
  });

  it('filters findByEmergencyId by type', async () => {
    const EM = '99999999-9999-4999-8999-999999999999';
    const structural = Report.create({
      emergencyId: EM,
      reporterUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'Structural',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Moderate,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    const incident = Report.create({
      emergencyId: EM,
      reporterUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      type: ReportType.Incident,
      note: 'Incident',
      priority: ReportPriority.Low,
    });
    await Promise.all([repo.save(structural), repo.save(incident)]);

    const results = await repo.findByEmergencyId(EM, {
      type: ReportType.StructuralDamage,
    });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(ReportType.StructuralDamage);
  });
});
