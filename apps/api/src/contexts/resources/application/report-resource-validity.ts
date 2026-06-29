import { randomUUID } from 'node:crypto';
import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { EventBus } from '../domain/ports/event-bus';
import { ResourceId } from '../domain/resource-id';
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
/** Reports older than this are ignored when counting dispute votes. */
export const FRESHNESS_WINDOW_DAYS = 45;

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
    if (!resource.isPubliclyVisible()) throw new ResourceNotReportableError();
    if (resource.ownerUserId === cmd.reporterUserId) {
      throw new OwnerCannotReportValidityError();
    }

    const existing = await this.reports.findOpenByResourceAndReporter(
      cmd.resourceId,
      cmd.reporterUserId,
    );
    let report: ResourceValidityReport;
    if (existing) {
      // Re-report by the same user: refresh their open report. Forward note /
      // photos only when the caller actually supplied them — collapsing an
      // omitted field to null/[] would wipe what they reported before.
      existing.update({
        reason: cmd.reason,
        ...(cmd.note !== undefined && { note: cmd.note }),
        ...(cmd.photoUrls !== undefined && { photoUrls: cmd.photoUrls }),
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

    const open = await this.reports.findOpenByResource(cmd.resourceId);
    const cutoff = new Date(
      Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const freshDistinct = open.filter((r) => r.createdAt >= cutoff).length;
    let disputed = freshDistinct >= this.threshold;
    if (disputed && !resource.disputed) {
      // Re-read so the flag decision uses the current persisted state, not the
      // snapshot loaded before this report was saved — two citizens crossing
      // the threshold at once must not each emit a ResourceDisputed event.
      const current = await this.resources.findById(
        ResourceId.fromString(cmd.resourceId),
      );
      if (current && !current.disputed) {
        current.flagDisputed();
        await this.resources.save(current);
        await this.bus.publish(current.pullDomainEvents());
        disputed = true;
      } else if (current) {
        disputed = current.disputed;
      }
    }

    return { id: report.id, disputed };
  }
}
