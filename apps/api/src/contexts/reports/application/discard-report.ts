import { ReportRepository } from '../domain/ports/report.repository';
import { ReportNotFoundError } from '../domain/report-errors';
import { MutationAuditResult } from '../../../shared/domain/mutation-audit';

export interface DiscardReportCommand {
  reportId: string;
}

/**
 * Discard a report during triage: it transitions to `closed` and is dismissed.
 * The HTTP layer records the mandatory reason in the audit trail.
 */
export class DiscardReport {
  constructor(private readonly repo: ReportRepository) {}

  async execute(cmd: DiscardReportCommand): Promise<MutationAuditResult> {
    const report = await this.repo.findById(cmd.reportId);
    if (!report) throw new ReportNotFoundError(cmd.reportId);

    const before = report.status;
    report.discard();
    await this.repo.save(report);

    return {
      emergencyId: report.emergencyId,
      changes: [{ field: 'status', before, after: report.status }],
      targetStatus: report.status,
    };
  }
}
