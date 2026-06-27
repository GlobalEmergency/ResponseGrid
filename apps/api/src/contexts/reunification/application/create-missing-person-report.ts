import { MissingPersonReport } from '../domain/missing-person-report';
import { MissingPersonReportId } from '../domain/missing-person-report-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { PersonDataProps } from '../domain/person-data';
import { ReporterInfoProps } from '../domain/reporter-info';
import {
  MISSING_PERSON_REPORT_REPOSITORY,
  MissingPersonReportRepository,
} from '../domain/ports/missing-person-report.repository';
import {
  REUNIFICATION_EMERGENCY_STATUS_READER,
  ReunificationEmergencyStatusReader,
} from '../domain/ports/reunification-emergency-status-reader';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

export {
  MISSING_PERSON_REPORT_REPOSITORY,
  REUNIFICATION_EMERGENCY_STATUS_READER,
};

const ACTIVE_STATUS = 'active';

export interface CreateMissingPersonReportCommand {
  emergencyId: string;
  person: PersonDataProps;
  reporter: ReporterInfoProps;
  consentGiven: boolean;
}

export class CreateMissingPersonReport {
  constructor(
    private readonly repo: MissingPersonReportRepository,
    private readonly statusReader: ReunificationEmergencyStatusReader,
  ) {}

  async execute(
    cmd: CreateMissingPersonReportCommand,
  ): Promise<{ id: string; status: string }> {
    const status = await this.statusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    const report = MissingPersonReport.create({
      id: MissingPersonReportId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      person: cmd.person,
      reporter: cmd.reporter,
      consentGiven: cmd.consentGiven,
    });

    await this.repo.save(report);
    return { id: report.id.value, status: report.status };
  }
}
