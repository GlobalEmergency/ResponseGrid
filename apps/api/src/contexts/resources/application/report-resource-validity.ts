import { randomUUID } from 'node:crypto';
import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { EventBus } from '../domain/ports/event-bus';
import { ResourceId } from '../domain/resource-id';
import { PublicStatus } from '../domain/resource-enums';
import {
  ResourceValidityReport,
  ValidityReason,
} from '../domain/resource-validity-report';
import {
  OwnerCannotReportValidityError,
  ResourceNotReportableError,
} from '../domain/resource-errors';
import { ResourceNotFoundError } from './resource-not-found.error';

export interface ReportResourceValidityCommand {
  resourceId: string;
  reporterUserId: string;
  reason: ValidityReason;
  note?: string | null;
  photoUrls?: string[];
}

/** Distinct citizen reports that flip a resource to `disputed`. */
export const DEFAULT_DISPUTE_THRESHOLD = 3;

/**
 * A logged-in citizen reports that a published point is no longer valid. We
 * upsert the reporter's open report (one per user), then — once enough distinct
 * users have an open report — flag the resource `disputed` so coordination
 * reviews it. The point stays visible meanwhile.
 */
export class ReportResourceValidity {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly reports: ResourceValidityReportRepository,
    private readonly bus: EventBus,
    private readonly threshold: number = DEFAULT_DISPUTE_THRESHOLD,
  ) {}

  async execute(
    cmd: ReportResourceValidityCommand,
  ): Promise<{ id: string; disputed: boolean }> {
    const resource = await this.resources.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) {
      throw new ResourceNotFoundError(cmd.resourceId);
    }
    const visible =
      resource.publicStatus === PublicStatus.Active ||
      resource.publicStatus === PublicStatus.Saturated ||
      resource.publicStatus === PublicStatus.Paused;
    if (!visible) throw new ResourceNotReportableError();
    if (resource.ownerUserId === cmd.reporterUserId) {
      throw new OwnerCannotReportValidityError();
    }

    const existing = await this.reports.findOpenByResourceAndReporter(
      cmd.resourceId,
      cmd.reporterUserId,
    );
    let report: ResourceValidityReport;
    if (existing) {
      existing.update({
        reason: cmd.reason,
        note: cmd.note ?? null,
        photoUrls: cmd.photoUrls ?? [],
      });
      report = existing;
    } else {
      report = ResourceValidityReport.open({
        id: randomUUID(),
        resourceId: cmd.resourceId,
        emergencyId: resource.emergencyId.value,
        reporterUserId: cmd.reporterUserId,
        reason: cmd.reason,
        note: cmd.note ?? null,
        photoUrls: cmd.photoUrls ?? [],
      });
    }
    await this.reports.save(report);

    const distinct = await this.reports.countOpenByResource(cmd.resourceId);
    if (distinct >= this.threshold && !resource.disputed) {
      resource.flagDisputed();
      await this.resources.save(resource);
      await this.bus.publish(resource.pullDomainEvents());
    }

    return { id: report.id, disputed: resource.disputed };
  }
}
