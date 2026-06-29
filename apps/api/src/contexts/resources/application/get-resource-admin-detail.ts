import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceValidityReportRepository } from '../domain/ports/resource-validity-report.repository';
import { ResourceId } from '../domain/resource-id';
import { ResourceValidityReportSnapshot } from '../domain/resource-validity-report';
import {
  ResourceAdminDetailView,
  toResourceAdminDetailView,
} from './resource-admin-view';

export interface ResourceAdminDetailResult {
  resource: ResourceAdminDetailView;
  validityReports: ResourceValidityReportSnapshot[];
}

/**
 * Platform-admin detail of one resource, of ANY status (the public lookup only
 * returns visible/verified ones). Returns the full resource view + its
 * aggregated declared inventory + every citizen validity report (open +
 * resolved), so the admin can inspect a center whether or not it is published
 * (#177). Authorization is enforced at the controller (`resource:read` at the
 * platform scope = platform admin only). Returns null when the resource does not
 * exist so the controller can answer 404.
 */
export class GetResourceAdminDetail {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly validityReports: ResourceValidityReportRepository,
  ) {}

  async execute(q: {
    resourceId: string;
  }): Promise<ResourceAdminDetailResult | null> {
    const id = ResourceId.fromString(q.resourceId);
    const found = await this.repo.findByIdForAdmin(id);
    if (found === null) return null;

    const reports = await this.validityReports.findByResource(q.resourceId);

    return {
      resource: toResourceAdminDetailView(found.resource, found.emergencyName),
      validityReports: reports.map((r) => r.toSnapshot()),
    };
  }
}
