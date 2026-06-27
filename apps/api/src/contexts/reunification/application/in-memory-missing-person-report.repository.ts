import { MissingPersonReport } from '../domain/missing-person-report';
import { MissingPersonReportId } from '../domain/missing-person-report-id';
import { MissingPersonStatus } from '../domain/missing-person-status';
import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';

export class InMemoryMissingPersonReportRepository implements MissingPersonReportRepository {
  private store = new Map<string, MissingPersonReport>();

  save(report: MissingPersonReport): Promise<void> {
    this.store.set(report.id.value, report);
    return Promise.resolve();
  }

  findById(id: MissingPersonReportId): Promise<MissingPersonReport | null> {
    return Promise.resolve(this.store.get(id.value) ?? null);
  }

  findByEmergency(
    emergencyId: string,
    filters?: { status?: MissingPersonStatus },
  ): Promise<MissingPersonReport[]> {
    let results = [...this.store.values()].filter(
      (r) => r.emergencyId.value === emergencyId,
    );
    if (filters?.status !== undefined) {
      results = results.filter((r) => r.status === filters.status);
    }
    return Promise.resolve(results);
  }

  findByDocumentId(
    emergencyId: string,
    documentId: string,
  ): Promise<MissingPersonReport[]> {
    return Promise.resolve(
      [...this.store.values()].filter(
        (r) =>
          r.emergencyId.value === emergencyId &&
          r.person.documentId === documentId,
      ),
    );
  }

  findByUser(
    emergencyId: string,
    userId: string,
  ): Promise<MissingPersonReport[]> {
    return Promise.resolve(
      [...this.store.values()].filter(
        (r) =>
          r.emergencyId.value === emergencyId && r.reporter.userId === userId,
      ),
    );
  }

  findEmergencyId(reportId: string): Promise<string | null> {
    const report = this.store.get(reportId);
    return Promise.resolve(report ? report.emergencyId.value : null);
  }
}
