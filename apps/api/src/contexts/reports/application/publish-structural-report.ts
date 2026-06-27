import { ReportRepository } from '../domain/ports/report.repository';
import { ReportNotFoundError } from '../domain/report-errors';

export interface PublishStructuralReportCommand {
  reportId: string;
  publishNote?: string;
}

export class PublishStructuralReport {
  constructor(private readonly repo: ReportRepository) {}

  async execute(cmd: PublishStructuralReportCommand): Promise<void> {
    const report = await this.repo.findById(cmd.reportId);
    if (!report) {
      throw new ReportNotFoundError(cmd.reportId);
    }
    report.publish(cmd.publishNote);
    await this.repo.save(report);
  }
}
