import { MissingPersonReportId } from '../domain/missing-person-report-id';
import { SightingId } from '../domain/sighting-id';
import { MissingPersonReportRepository } from '../domain/ports/missing-person-report.repository';
import { MissingPersonReportNotFoundError } from '../domain/missing-person-report-errors';
import { LocationProps } from '../../../shared/domain/location';

export interface RegisterSightingCommand {
  reportId: string;
  reportedByUserId: string | null;
  reportedByName: string | null;
  location: string;
  coords: LocationProps | null;
  note: string;
}

export class RegisterSighting {
  constructor(private readonly repo: MissingPersonReportRepository) {}

  async execute(cmd: RegisterSightingCommand): Promise<{ sightingId: string }> {
    const report = await this.repo.findById(
      MissingPersonReportId.fromString(cmd.reportId),
    );
    if (!report) {
      throw new MissingPersonReportNotFoundError(cmd.reportId);
    }

    const sightingId = SightingId.create();
    report.addSighting({
      id: sightingId,
      reportedByUserId: cmd.reportedByUserId,
      reportedByName: cmd.reportedByName,
      location: cmd.location,
      coords: cmd.coords,
      note: cmd.note,
    });

    await this.repo.save(report);
    return { sightingId: sightingId.value };
  }
}
