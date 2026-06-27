import { MissingPersonStatus } from '../domain/missing-person-status';
import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportSnapshot } from '../domain/missing-person-report';

export interface ListMissingPersonReportsQuery {
  emergencyId: string;
  status?: MissingPersonStatus;
}

export class ListMissingPersonReports {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(
    query: ListMissingPersonReportsQuery,
  ): Promise<MissingPersonReportSnapshot[]> {
    const filters: { status?: MissingPersonStatus } = {};
    if (query.status !== undefined) filters.status = query.status;
    const reports = await this.repo.findByEmergency(query.emergencyId, filters);
    return reports.map((r) => r.toSnapshot());
  }
}
