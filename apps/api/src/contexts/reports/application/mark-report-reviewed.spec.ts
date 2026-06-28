import { MarkReportReviewed } from './mark-report-reviewed';
import { SubmitReport } from './submit-report';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../domain/report-enums';
import { ReportNotFoundError } from '../domain/report-errors';
import { ReportAlreadyReviewedError } from '../domain/report-errors';

function makeRepo(): ReportRepository {
  const store = new Map<string, Report>();
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
  };
}

describe('MarkReportReviewed', () => {
  it('marks a report as reviewed and persists it', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    const { id } = await submit.execute({
      emergencyId: 'em-1',
      reporterUserId: 'u1',
      type: ReportType.Incident,
      note: 'Bridge blocked',
      priority: ReportPriority.High,
    });

    const uc = new MarkReportReviewed(repo);
    await uc.execute({ reportId: id });

    const report = await repo.findById(id);
    expect(report!.status).toBe(ReportStatus.Reviewed);
    expect(report!.reviewedAt).not.toBeNull();
  });

  it('throws ReportNotFoundError when report does not exist', async () => {
    const repo = makeRepo();
    const uc = new MarkReportReviewed(repo);
    await expect(uc.execute({ reportId: 'nonexistent-id' })).rejects.toThrow(
      ReportNotFoundError,
    );
  });

  it('throws ReportAlreadyReviewedError when already reviewed', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    const { id } = await submit.execute({
      emergencyId: 'em-1',
      reporterUserId: 'u1',
      type: ReportType.Status,
      note: 'All good',
      priority: ReportPriority.Low,
    });
    const uc = new MarkReportReviewed(repo);
    await uc.execute({ reportId: id });
    await expect(uc.execute({ reportId: id })).rejects.toThrow(
      ReportAlreadyReviewedError,
    );
  });
});
