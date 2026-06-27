import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportSnapshot } from '../domain/missing-person-report';

export interface GetMyReportsQuery {
  emergencyId: string;
  userId: string;
}

export class GetMyReports {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(
    query: GetMyReportsQuery,
  ): Promise<MissingPersonReportSnapshot[]> {
    const reports = await this.repo.findByUser(query.emergencyId, query.userId);
    return reports.map((r) => r.toSnapshot());
  }
}
