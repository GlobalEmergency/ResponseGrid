import { GetReportsQueue } from './get-reports-queue';
import { SubmitReport } from './submit-report';
import {
  ReportRepository,
  ReportQueueFilters,
} from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../domain/report-enums';

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
    findByEmergencyId(
      emergencyId: string,
      filters: ReportQueueFilters = {},
    ): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter((r) => {
          if (r.emergencyId !== emergencyId) return false;
          if (filters.status && r.status !== filters.status) return false;
          if (filters.priority && r.priority !== filters.priority) return false;
          if (filters.resourceId && r.resourceId !== filters.resourceId)
            return false;
          return true;
        }),
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

const EM = 'em-test-1111';

describe('GetReportsQueue', () => {
  it('returns all reports for an emergency', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u1',
      type: ReportType.Incident,
      note: 'A',
      priority: ReportPriority.High,
    });
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u2',
      type: ReportType.Stock,
      note: 'B',
      priority: ReportPriority.Low,
    });
    const uc = new GetReportsQueue(repo);
    const results = await uc.execute({ emergencyId: EM });
    expect(results).toHaveLength(2);
  });

  it('filters by status', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    const r1 = await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u1',
      type: ReportType.Incident,
      note: 'Open',
      priority: ReportPriority.High,
    });
    // Mark r1 as reviewed
    const saved = await repo.findById(r1.id);
    saved!.markReviewed();
    await repo.save(saved!);

    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u2',
      type: ReportType.Stock,
      note: 'Still open',
      priority: ReportPriority.Low,
    });

    const uc = new GetReportsQueue(repo);
    const open = await uc.execute({
      emergencyId: EM,
      filters: { status: ReportStatus.Open },
    });
    expect(open).toHaveLength(1);
    expect(open[0].note).toBe('Still open');
  });

  it('filters by priority', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u1',
      type: ReportType.Other,
      note: 'Urgent one',
      priority: ReportPriority.Urgent,
    });
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u2',
      type: ReportType.Other,
      note: 'Low one',
      priority: ReportPriority.Low,
    });

    const uc = new GetReportsQueue(repo);
    const results = await uc.execute({
      emergencyId: EM,
      filters: { priority: ReportPriority.Urgent },
    });
    expect(results).toHaveLength(1);
    expect(results[0].note).toBe('Urgent one');
  });

  it('filters by resourceId', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u1',
      type: ReportType.Status,
      note: 'For res A',
      priority: ReportPriority.Medium,
      resourceId: 'res-A',
    });
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'u2',
      type: ReportType.Status,
      note: 'For res B',
      priority: ReportPriority.Medium,
      resourceId: 'res-B',
    });

    const uc = new GetReportsQueue(repo);
    const results = await uc.execute({
      emergencyId: EM,
      filters: { resourceId: 'res-A' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].resourceId).toBe('res-A');
  });
});
