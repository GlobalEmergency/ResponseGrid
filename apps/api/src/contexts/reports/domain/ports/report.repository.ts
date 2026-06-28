import { Report } from '../report';
import { ReportPriority, ReportStatus, ReportType } from '../report-enums';

export const REPORT_REPOSITORY = Symbol('ReportRepository');

export interface ReportQueueFilters {
  status?: ReportStatus;
  priority?: ReportPriority;
  resourceId?: string;
  type?: ReportType;
}

export interface ReportRepository {
  save(report: Report): Promise<void>;
  findById(id: string): Promise<Report | null>;
  findByEmergencyId(
    emergencyId: string,
    filters?: ReportQueueFilters,
  ): Promise<Report[]>;
  findByEmergencyIdAndReporter(
    emergencyId: string,
    reporterUserId: string,
  ): Promise<Report[]>;
}
