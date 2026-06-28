import { ReportRepository } from '../domain/ports/report.repository';
import { EditReportProps } from '../domain/report';
import { ReportPriority } from '../domain/report-enums';
import { ReportNotFoundError } from '../domain/report-errors';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export interface EditReportCommand {
  reportId: string;
  note?: string;
  priority?: ReportPriority;
}

/**
 * Coordinator edit of a field report during triage. Returns the before/after
 * diff so the HTTP layer can record it in the audit trail; the mandatory reason
 * is captured there. Status is unchanged (targetStatus null).
 */
export class EditReport {
  constructor(private readonly repo: ReportRepository) {}

  async execute(cmd: EditReportCommand): Promise<MutationAuditResult> {
    const report = await this.repo.findById(cmd.reportId);
    if (!report) throw new ReportNotFoundError(cmd.reportId);

    const before = {
      note: report.note,
      priority: report.priority,
    };

    const edit: EditReportProps = {};
    if (cmd.note !== undefined) edit.note = cmd.note;
    if (cmd.priority !== undefined) edit.priority = cmd.priority;
    report.edit(edit);

    const after = {
      note: report.note,
      priority: report.priority,
    };

    await this.repo.save(report);

    return {
      emergencyId: report.emergencyId,
      changes: diffFields(before, after),
      targetStatus: null,
    };
  }
}
