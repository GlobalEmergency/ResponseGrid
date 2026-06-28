import { DiscardReport } from './discard-report';
import { SubmitReport } from './submit-report';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../domain/report-enums';
import {
  ReportAlreadyClosedError,
  ReportNotFoundError,
} from '../domain/report-errors';

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

const EM = 'em-1';

describe('DiscardReport', () => {
  let repo: ReportRepository;
  let discardReport: DiscardReport;
  let submitReport: SubmitReport;

  beforeEach(() => {
    repo = makeRepo();
    discardReport = new DiscardReport(repo);
    submitReport = new SubmitReport(repo);
  });

  async function seed(): Promise<string> {
    const { id } = await submitReport.execute({
      emergencyId: EM,
      reporterUserId: 'u1',
      type: ReportType.Incident,
      note: 'Puente bloqueado',
      priority: ReportPriority.Medium,
    });
    return id;
  }

  it('transitions the report to closed and reports the status change', async () => {
    const id = await seed();

    const result = await discardReport.execute({ reportId: id });

    const report = await repo.findById(id);
    expect(report!.status).toBe(ReportStatus.Closed);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBe(ReportStatus.Closed);
    expect(result.changes).toEqual([
      {
        field: 'status',
        before: ReportStatus.Open,
        after: ReportStatus.Closed,
      },
    ]);
  });

  it('throws ReportNotFoundError for an unknown id', async () => {
    await expect(
      discardReport.execute({ reportId: 'nonexistent-id' }),
    ).rejects.toThrow(ReportNotFoundError);
  });

  it('cannot discard a report that is already closed', async () => {
    const id = await seed();
    await discardReport.execute({ reportId: id });

    await expect(discardReport.execute({ reportId: id })).rejects.toThrow(
      ReportAlreadyClosedError,
    );
  });
});
