import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyView, toEmergencyView } from './emergency-view';

/**
 * One emergency the principal holds a grant in, enriched with the role ids the
 * principal holds at that emergency scope (so the caller can derive what the
 * principal may do there).
 */
export interface MyEmergencyView extends EmergencyView {
  roleIds: string[];
}

/**
 * A grant as it reaches this use case — the controller passes the
 * already-resolved request grants (see {@link AuthenticatedUser}). Only the
 * fields needed to resolve emergency scope are required.
 */
export interface PrincipalGrant {
  roleId: string;
  scope: { type: string; id?: string };
  expiresAt: string | null;
}

/**
 * Lists the emergencies a principal is granted into, regardless of status
 * (active, paused or closed). This deliberately differs from
 * {@link ListActiveEmergencies}: a verifier or coordinator must keep reaching
 * the coordination panel of an emergency that has been paused. Expired grants
 * are ignored.
 */
export class ListMyEmergencies {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(
    grants: PrincipalGrant[],
    now: Date = new Date(),
  ): Promise<MyEmergencyView[]> {
    // Map of emergencyId -> role ids held at that scope (deduped, active grants).
    const roleIdsByEmergency = new Map<string, string[]>();
    for (const g of grants) {
      if (g.scope.type !== 'emergency') continue;
      const scopeId = g.scope.id;
      if (scopeId == null || scopeId === '') continue;
      if (
        g.expiresAt != null &&
        new Date(g.expiresAt).getTime() <= now.getTime()
      ) {
        continue;
      }
      const roleIds = roleIdsByEmergency.get(scopeId) ?? [];
      if (!roleIds.includes(g.roleId)) roleIds.push(g.roleId);
      roleIdsByEmergency.set(scopeId, roleIds);
    }

    if (roleIdsByEmergency.size === 0) return [];

    const ids = [...roleIdsByEmergency.keys()].map((id) =>
      EmergencyId.fromString(id),
    );
    const emergencies = await this.repo.findByIds(ids);

    return emergencies.map((e) => ({
      ...toEmergencyView(e),
      roleIds: roleIdsByEmergency.get(e.id.value) ?? [],
    }));
  }
}
