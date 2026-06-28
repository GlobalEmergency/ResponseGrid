import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { EventBus } from '../domain/ports/event-bus';
import { ResourceId } from '../domain/resource-id';
import { PublicStatus } from '../domain/resource-enums';
import { ResourceNotDisputedError } from '../domain/resource-errors';
import { ResourceNotFoundError } from './resource-not-found.error';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export type DisputeResolution = 'confirm_closed' | 'mark_invalid' | 'dismiss';

export interface ResolveResourceDisputeCommand {
  resourceId: string;
  coordinatorId: string;
  resolution: DisputeResolution;
}

/**
 * A coordinator resolves a disputed resource:
 *  - `confirm_closed` → set public status to Closed (reversible) + accept reports
 *  - `mark_invalid`   → mark the resource invalid/rejected + accept reports
 *  - `dismiss`        → the point stays active, dismiss the reports
 * In all cases the disputed flag is cleared. Returns a MutationAuditResult so
 * the HTTP layer records the reason + diff in the activity trail.
 */
export class ResolveResourceDispute {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly reports: ResourceValidityReportRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(
    cmd: ResolveResourceDisputeCommand,
  ): Promise<MutationAuditResult> {
    const resource = await this.resources.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);
    if (!resource.disputed) throw new ResourceNotDisputedError();

    const before = {
      disputed: resource.disputed,
      publicStatus: resource.publicStatus,
      verificationLevel: resource.verificationLevel,
    };

    const openReports = await this.reports.findOpenByResource(cmd.resourceId);

    if (cmd.resolution === 'confirm_closed') {
      resource.changePublicStatus(PublicStatus.Closed);
      for (const r of openReports) r.accept(cmd.coordinatorId);
    } else if (cmd.resolution === 'mark_invalid') {
      resource.markInvalid();
      for (const r of openReports) r.accept(cmd.coordinatorId);
    } else {
      for (const r of openReports) r.dismiss(cmd.coordinatorId);
    }
    resource.clearDispute(cmd.resolution);

    await this.resources.save(resource);
    for (const r of openReports) await this.reports.save(r);
    await this.bus.publish(resource.pullDomainEvents());

    const after = {
      disputed: resource.disputed,
      publicStatus: resource.publicStatus,
      verificationLevel: resource.verificationLevel,
    };

    const targetStatus =
      cmd.resolution === 'confirm_closed'
        ? resource.publicStatus
        : cmd.resolution === 'mark_invalid'
          ? resource.verificationLevel
          : null;

    return {
      emergencyId: resource.emergencyId.value,
      changes: diffFields(before, after),
      targetStatus,
    };
  }
}
