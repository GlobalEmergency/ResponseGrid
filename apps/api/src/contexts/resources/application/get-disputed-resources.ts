import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceView, toResourceView } from './resource-view';
import { FRESHNESS_WINDOW_DAYS } from './report-resource-validity';

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

/** Coordination queue: resources with enough fresh open reports, plus reasons. */
export class GetDisputedResources {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly reports: ResourceValidityReportRepository,
  ) {}

  async execute(q: GetDisputedResourcesQuery): Promise<DisputedResourceView[]> {
    const visible = await this.resources.findVisibleByEmergency(
      EmergencyId.fromString(q.emergencyId),
    );
    const cutoff = new Date(
      Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const disputed = await Promise.all(
      visible.map(async (resource) => {
        const open = await this.reports.findOpenByResource(resource.id.value);
        const fresh = open.filter((r) => r.createdAt >= cutoff);
        if (fresh.length === 0) return null;

        const byReason: Record<string, number> = {};
        let last: Date | null = null;
        for (const r of fresh) {
          byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
          if (!last || r.createdAt > last) last = r.createdAt;
        }
        return {
          resource: toResourceView(resource),
          distinctReporters: fresh.length,
          byReason,
          lastReportedAt: last ? last.toISOString() : null,
        };
      }),
    );

    return disputed.filter(
      (resource): resource is DisputedResourceView => resource !== null,
    );
  }
}
