import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  PublicStatus,
  ResourceType,
  VerificationLevel,
} from '../domain/resource-enums';
import { ResourceAdminView, toResourceAdminView } from './resource-admin-view';

export interface ListResourcesAdminResult {
  items: ResourceAdminView[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Platform-admin list of ALL centers/resources across every emergency and every
 * status + verification level (hidden/active/saturated/paused/closed,
 * unverified→official) — not the per-emergency pending queue nor the public,
 * verified-only list (#177). Filterable by emergency (optional → global),
 * type, status, verification and a free-text search; paginated. Authorization is
 * enforced at the controller (`resource:read` resolved at the platform scope =
 * platform admin only); this use case adds no visibility gate by design.
 */
export class ListResourcesAdmin {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    page?: number;
    limit?: number;
    emergencyId?: string;
    type?: ResourceType;
    status?: PublicStatus;
    verification?: VerificationLevel;
    q?: string;
  }): Promise<ListResourcesAdminResult> {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 50, 100);

    const { items, total } = await this.repo.findAllPaged({
      page,
      limit,
      ...(q.emergencyId !== undefined && {
        emergencyId: EmergencyId.fromString(q.emergencyId),
      }),
      ...(q.type !== undefined && { type: q.type }),
      ...(q.status !== undefined && { status: q.status }),
      ...(q.verification !== undefined && { verification: q.verification }),
      ...(q.q !== undefined && q.q !== '' && { q: q.q }),
    });

    return {
      items: items.map((row) =>
        toResourceAdminView(row.resource, row.emergencyName),
      ),
      total,
      page,
      limit,
    };
  }
}
