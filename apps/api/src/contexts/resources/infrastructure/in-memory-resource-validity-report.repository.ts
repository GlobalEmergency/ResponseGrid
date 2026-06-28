import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import {
  ResourceValidityReport,
  ResourceValidityReportSnapshot,
  ValidityReportStatus,
} from '../domain/resource-validity-report';

export class InMemoryResourceValidityReportRepository implements ResourceValidityReportRepository {
  private store = new Map<string, ResourceValidityReportSnapshot>();

  save(report: ResourceValidityReport): Promise<void> {
    this.store.set(report.id, report.toSnapshot());
    return Promise.resolve();
  }

  findOpenByResourceAndReporter(
    resourceId: string,
    reporterUserId: string,
  ): Promise<ResourceValidityReport | null> {
    const snap = [...this.store.values()].find(
      (s) =>
        s.resourceId === resourceId &&
        s.reporterUserId === reporterUserId &&
        s.status === ValidityReportStatus.Open,
    );
    return Promise.resolve(
      snap ? ResourceValidityReport.fromSnapshot(snap) : null,
    );
  }

  findOpenByResource(resourceId: string): Promise<ResourceValidityReport[]> {
    return Promise.resolve(
      [...this.store.values()]
        .filter(
          (s) =>
            s.resourceId === resourceId &&
            s.status === ValidityReportStatus.Open,
        )
        .map((s) => ResourceValidityReport.fromSnapshot(s)),
    );
  }

  findByResource(resourceId: string): Promise<ResourceValidityReport[]> {
    return Promise.resolve(
      [...this.store.values()]
        .filter((s) => s.resourceId === resourceId)
        .map((s) => ResourceValidityReport.fromSnapshot(s)),
    );
  }

  countOpenByResource(resourceId: string): Promise<number> {
    return Promise.resolve(
      [...this.store.values()].filter(
        (s) =>
          s.resourceId === resourceId && s.status === ValidityReportStatus.Open,
      ).length,
    );
  }
}
