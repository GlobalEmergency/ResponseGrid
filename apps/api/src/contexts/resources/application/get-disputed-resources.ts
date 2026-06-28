import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';

export interface DisputedResourceView {
  resource: ResourceView;
  /** Distinct citizens with an open report (the dispute "votes"). */
  distinctReporters: number;
  /** Open-report counts keyed by reason (closed/nonexistent/moved/outdated). */
  byReason: Record<string, number>;
  /** ISO timestamp of the most recent open report, or null. */
  lastReportedAt: string | null;
}

export interface GetDisputedResourcesQuery {
  emergencyId: string;
}

/** Coordination queue: resources flagged `disputed`, with a reason breakdown. */
export class GetDisputedResources {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly reports: ResourceValidityReportRepository,
  ) {}

  async execute(q: GetDisputedResourcesQuery): Promise<DisputedResourceView[]> {
    const disputed = await this.resources.findDisputedByEmergency(
      EmergencyId.fromString(q.emergencyId),
    );

    const out: DisputedResourceView[] = [];
    for (const resource of disputed) {
      const open = await this.reports.findOpenByResource(resource.id.value);
      const byReason: Record<string, number> = {};
      let last: Date | null = null;
      for (const r of open) {
        byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
        if (!last || r.createdAt > last) last = r.createdAt;
      }
      out.push({
        resource: toResourceView(resource),
        distinctReporters: open.length,
        byReason,
        lastReportedAt: last ? last.toISOString() : null,
      });
    }
    return out;
  }
}
