import { PublishStructuralReport } from './publish-structural-report';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
} from '../domain/report-enums';
import {
  ReportNotFoundError,
  ReportNotInReviewedStatusError,
} from '../domain/report-errors';

function makeRepo(initial: Report[] = []): ReportRepository {
  const store = new Map<string, Report>(initial.map((r) => [r.id, r]));
  return {
    save(r: Report): Promise<void> {
      store.set(r.id, r);
      return Promise.resolve();
    },
    findById(id: string): Promise<Report | null> {
      return Promise.resolve(store.get(id) ?? null);
    },
    findByEmergencyId(emergencyId: string): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter((r) => r.emergencyId === emergencyId),
      );
    },
    findByEmergencyIdAndReporter(
      emergencyId: string,
      uid: string,
    ): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter(
          (r) => r.emergencyId === emergencyId && r.reporterUserId === uid,
        ),
      );
    },
    findPublishedStructuralByEmergencyId(
      emergencyId: string,
    ): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter(
          (r) =>
            r.emergencyId === emergencyId &&
            r.status === ReportStatus.Published,
        ),
      );
    },
  };
}

function makeStructuralReport(
  overrides: Partial<{
    type: ReportType;
    priority: ReportPriority;
    damageLevel: DamageLevel;
  }> = {},
): Report {
  return Report.create({
    emergencyId: 'em-1111-1111-1111-111111111111',
    reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    type: overrides.type ?? ReportType.StructuralDamage,
    note: 'Building partially collapsed',
    priority: overrides.priority ?? ReportPriority.High,
    structuralDetail: {
      damageLevel: overrides.damageLevel ?? DamageLevel.Severe,
      trappedPersonsEstimate: null,
      accessibleForRescue: null,
      buildingType: null,
    },
  });
}

describe('PublishStructuralReport', () => {
  it('publishes a reviewed structural report and persists it', async () => {
    const report = makeStructuralReport();
    report.markReviewed();
    const repo = makeRepo([report]);
    const uc = new PublishStructuralReport(repo);

    await uc.execute({ reportId: report.id, publishNote: 'Verified on site' });

    const saved = await repo.findById(report.id);
    expect(saved!.status).toBe(ReportStatus.Published);
    expect(saved!.publishNote).toBe('Verified on site');
    expect(saved!.publishedAt).not.toBeNull();
  });

  it('publishes without a publishNote (note stays null)', async () => {
    const report = makeStructuralReport();
    report.markReviewed();
    const repo = makeRepo([report]);
    const uc = new PublishStructuralReport(repo);

    await uc.execute({ reportId: report.id });

    const saved = await repo.findById(report.id);
    expect(saved!.status).toBe(ReportStatus.Published);
    expect(saved!.publishNote).toBeNull();
  });

  it('throws ReportNotFoundError for unknown reportId', async () => {
    const repo = makeRepo([]);
    const uc = new PublishStructuralReport(repo);
    await expect(
      uc.execute({ reportId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }),
    ).rejects.toThrow(ReportNotFoundError);
  });

  it('throws ReportNotInReviewedStatusError when report is still Open', async () => {
    const report = makeStructuralReport();
    // Not reviewed — still Open
    const repo = makeRepo([report]);
    const uc = new PublishStructuralReport(repo);
    await expect(uc.execute({ reportId: report.id })).rejects.toThrow(
      ReportNotInReviewedStatusError,
    );
  });
});
