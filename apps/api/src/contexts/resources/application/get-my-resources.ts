import { ResourceRepository } from '../domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceId } from '../domain/resource-id';
import { ResourceView, toResourceView } from './resource-view';
import { PrincipalGrant, grantedResourceIds } from './principal-grant';

export class GetMyResources {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(q: {
    emergencyId: string;
    userId: string;
    grants?: PrincipalGrant[];
    now?: Date;
  }): Promise<ResourceView[]> {
    const emergencyId = EmergencyId.fromString(q.emergencyId);
    const owned = await this.repo.findByOwnerAndEmergency(
      q.userId,
      emergencyId,
    );

    // Owner ∪ resources reached through an active entity-scoped grant on the
    // resource (e.g. `point_manager`), restricted to THIS emergency. Same grant
    // definition the panel (`/resources/mine`) and the management gate use
    // (`grantedResourceIds`, #316), so `mis-puntos` stops diverging from the
    // panel and a gestor sees — and can operate — their point here (#323).
    // Deduped by id, owned first; the full `ResourceView` (with `publicStatus`)
    // is preserved because the list renders the status form per point.
    const byId = new Map(owned.map((r) => [r.id.value, r]));
    const grantedIds = [
      ...grantedResourceIds(q.grants ?? [], q.now ?? new Date()),
    ].filter((id) => !byId.has(id));
    const granted = await Promise.all(
      grantedIds.map((id) => this.repo.findById(ResourceId.fromString(id))),
    );
    for (const r of granted) {
      if (r != null && r.emergencyId.value === q.emergencyId) {
        byId.set(r.id.value, r);
      }
    }

    return [...byId.values()].map(toResourceView);
  }
}
