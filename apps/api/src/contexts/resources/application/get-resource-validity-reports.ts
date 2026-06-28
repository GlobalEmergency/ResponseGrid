import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { ResourceValidityReportSnapshot } from '../domain/resource-validity-report';

export interface GetResourceValidityReportsQuery {
  resourceId: string;
}

/** Coordinator detail: every validity report (open + resolved) for a resource. */
export class GetResourceValidityReports {
  constructor(private readonly reports: ResourceValidityReportRepository) {}

  async execute(
    q: GetResourceValidityReportsQuery,
  ): Promise<ResourceValidityReportSnapshot[]> {
    const reports = await this.reports.findByResource(q.resourceId);
    return reports.map((r) => r.toSnapshot());
  }
}
