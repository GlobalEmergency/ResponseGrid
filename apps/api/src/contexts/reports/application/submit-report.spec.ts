import { SubmitReport } from './submit-report';
import { ReportRepository } from '../domain/ports/report.repository';
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

describe('SubmitReport', () => {
  it('persists a new report and returns its id', async () => {
    const repo = makeRepo();
    const uc = new SubmitReport(repo);
    const result = await uc.execute({
      emergencyId: 'em-1111',
      reporterUserId: 'usr-2222',
      type: ReportType.Incident,
      note: 'Water pipe broken',
      priority: ReportPriority.High,
    });
    expect(typeof result.id).toBe('string');
    const saved = await repo.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(ReportStatus.Open);
    expect(saved!.emergencyId).toBe('em-1111');
  });

  it('stores photoUrls when provided', async () => {
    const repo = makeRepo();
    const uc = new SubmitReport(repo);
    const photoUrls = ['/files/abc.jpg', '/files/def.png'];
    const { id } = await uc.execute({
      emergencyId: 'em-1111',
      reporterUserId: 'usr-2222',
      type: ReportType.Stock,
      note: 'Low on bandages',
      priority: ReportPriority.Urgent,
      photoUrls,
    });
    const saved = await repo.findById(id);
    expect(saved!.photoUrls).toEqual(photoUrls);
  });

  it('accepts optional resourceId and location', async () => {
    const repo = makeRepo();
    const uc = new SubmitReport(repo);
    const { id } = await uc.execute({
      emergencyId: 'em-1111',
      reporterUserId: 'usr-2222',
      type: ReportType.Status,
      note: 'Supply point operational',
      priority: ReportPriority.Low,
      resourceId: 'res-5678',
      location: { address: 'Test Ave', latitude: 40.0, longitude: -3.0 },
    });
    const saved = await repo.findById(id);
    expect(saved!.resourceId).toBe('res-5678');
    expect(saved!.location?.toPlain().address).toBe('Test Ave');
  });
});
