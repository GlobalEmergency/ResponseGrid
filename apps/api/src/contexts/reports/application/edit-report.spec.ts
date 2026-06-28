import { EditReport } from './edit-report';
import { SubmitReport } from './submit-report';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../domain/report-enums';
import {
  ReportNotEditableError,
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

describe('EditReport', () => {
  let repo: ReportRepository;
  let editReport: EditReport;
  let submitReport: SubmitReport;

  beforeEach(() => {
    repo = makeRepo();
    editReport = new EditReport(repo);
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

  it('applies the changes and reports the before/after diff', async () => {
    const id = await seed();

    const result = await editReport.execute({
      reportId: id,
      note: 'Puente bloqueado en km 5',
      priority: ReportPriority.Urgent,
    });

    const report = await repo.findById(id);
    expect(report!.note).toBe('Puente bloqueado en km 5');
    expect(report!.priority).toBe(ReportPriority.Urgent);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBeNull();
    expect(result.changes).toEqual(
      expect.arrayContaining([
        {
          field: 'note',
          before: 'Puente bloqueado',
          after: 'Puente bloqueado en km 5',
        },
        {
          field: 'priority',
          before: ReportPriority.Medium,
          after: ReportPriority.Urgent,
        },
      ]),
    );
    expect(result.changes).toHaveLength(2);
  });

  it('leaves omitted fields untouched and reports no change for them', async () => {
    const id = await seed();

    const result = await editReport.execute({
      reportId: id,
      note: 'Puente bloqueado en km 5',
    });

    expect(result.changes).toEqual([
      {
        field: 'note',
        before: 'Puente bloqueado',
        after: 'Puente bloqueado en km 5',
      },
    ]);
    const report = await repo.findById(id);
    expect(report!.priority).toBe(ReportPriority.Medium);
  });

  it('throws ReportNotFoundError for an unknown id', async () => {
    await expect(
      editReport.execute({ reportId: 'nonexistent-id', note: 'x' }),
    ).rejects.toThrow(ReportNotFoundError);
  });

  it('refuses to edit a closed report', async () => {
    const id = await seed();
    const report = await repo.findById(id);
    report!.discard();
    await repo.save(report!);

    await expect(
      editReport.execute({ reportId: id, note: 'x' }),
    ).rejects.toThrow(ReportNotEditableError);
  });

  it('reports an empty diff when nothing actually changed', async () => {
    const id = await seed();

    const result = await editReport.execute({
      reportId: id,
      note: 'Puente bloqueado',
    });

    expect(result.changes).toEqual([]);
    const report = await repo.findById(id);
    expect(report!.status).toBe(ReportStatus.Open);
  });
});
