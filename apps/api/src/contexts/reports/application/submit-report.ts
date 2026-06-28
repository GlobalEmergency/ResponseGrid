import {
  REPORT_REPOSITORY,
  ReportRepository,
} from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import { ReportType, ReportPriority } from '../domain/report-enums';
import { LocationProps } from '../../../shared/domain/location';

export interface SubmitReportCommand {
  emergencyId: string;
  reporterUserId: string;
  type: ReportType;
  note: string;
  photoUrls?: string[];
  priority: ReportPriority;
  resourceId?: string | null;
  location?: LocationProps | null;
}

export { REPORT_REPOSITORY };

export class SubmitReport {
  constructor(private readonly repo: ReportRepository) {}

  async execute(cmd: SubmitReportCommand): Promise<{ id: string }> {
    const report = Report.create({
      emergencyId: cmd.emergencyId,
      resourceId: cmd.resourceId ?? null,
      reporterUserId: cmd.reporterUserId,
      type: cmd.type,
      note: cmd.note,
      photoUrls: cmd.photoUrls ?? [],
      priority: cmd.priority,
      location: cmd.location ?? null,
    });
    await this.repo.save(report);
    return { id: report.id };
  }
}
