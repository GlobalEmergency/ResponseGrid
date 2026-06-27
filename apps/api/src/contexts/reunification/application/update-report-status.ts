import { MissingPersonReportId } from '../domain/missing-person-report-id';
import { MissingPersonStatus } from '../domain/missing-person-status';
import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportNotFoundError } from '../domain/missing-person-report-errors';

export interface UpdateReportStatusCommand {
  reportId: string;
  status: MissingPersonStatus;
  reviewedByUserId: string;
  matchNote?: string;
}

export class UpdateReportStatus {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(cmd: UpdateReportStatusCommand): Promise<void> {
    const report = await this.repo.findById(
      MissingPersonReportId.fromString(cmd.reportId),
    );
    if (!report) {
      throw new MissingPersonReportNotFoundError(cmd.reportId);
    }

    report.updateStatus(cmd.status, cmd.reviewedByUserId, cmd.matchNote);
    await this.repo.save(report);
  }
}
