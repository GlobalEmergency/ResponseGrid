import { MissingPersonReportId } from '../domain/missing-person-report-id';
import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportSnapshot } from '../domain/missing-person-report';
import { MissingPersonReportNotFoundError } from '../domain/missing-person-report-errors';

export interface GetMissingPersonReportQuery {
  reportId: string;
}

export class GetMissingPersonReport {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(
    query: GetMissingPersonReportQuery,
  ): Promise<MissingPersonReportSnapshot> {
    const report = await this.repo.findById(
      MissingPersonReportId.fromString(query.reportId),
    );
    if (!report) {
      throw new MissingPersonReportNotFoundError(query.reportId);
    }
    return report.toSnapshot();
  }
}
