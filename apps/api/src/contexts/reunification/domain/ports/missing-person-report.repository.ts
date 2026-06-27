import { MissingPersonReport } from '../missing-person-report';
import { MissingPersonReportId } from '../missing-person-report-id';
import { MissingPersonStatus } from '../missing-person-status';

export const MISSING_PERSON_REPORT_REPOSITORY = Symbol(
  'MissingPersonReportRepository',
);

export interface MissingPersonReportRepository {
  save(report: MissingPersonReport): Promise<void>;
  findById(id: MissingPersonReportId): Promise<MissingPersonReport | null>;
  findByEmergency(
    emergencyId: string,
    filters?: { status?: MissingPersonStatus },
  ): Promise<MissingPersonReport[]>;
  findByDocumentId(
    emergencyId: string,
    documentId: string,
  ): Promise<MissingPersonReport[]>;
  findByUser(
    emergencyId: string,
    userId: string,
  ): Promise<MissingPersonReport[]>;
  /** Returns emergencyId for the report, or null if not found. Used by entity-coordinator guard. */
  findEmergencyId(reportId: string): Promise<string | null>;
}
