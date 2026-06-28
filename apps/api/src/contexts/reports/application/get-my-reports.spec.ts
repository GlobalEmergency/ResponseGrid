import { GetMyReports } from './get-my-reports';
import { SubmitReport } from './submit-report';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import { ReportType, ReportPriority } from '../domain/report-enums';

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

const EM = 'em-my-reports';

describe('GetMyReports', () => {
  it('returns only reports submitted by the given user', async () => {
    const repo = makeRepo();
    const submit = new SubmitReport(repo);
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'user-A',
      type: ReportType.Incident,
      note: 'Mine',
      priority: ReportPriority.High,
    });
    await submit.execute({
      emergencyId: EM,
      reporterUserId: 'user-B',
      type: ReportType.Stock,
      note: 'Not mine',
      priority: ReportPriority.Low,
    });

    const uc = new GetMyReports(repo);
    const results = await uc.execute({ emergencyId: EM, userId: 'user-A' });
    expect(results).toHaveLength(1);
    expect(results[0].reporterUserId).toBe('user-A');
  });

  it('returns empty array when user has no reports in that emergency', async () => {
    const repo = makeRepo();
    const uc = new GetMyReports(repo);
    const results = await uc.execute({ emergencyId: EM, userId: 'nobody' });
    expect(results).toEqual([]);
  });
});
