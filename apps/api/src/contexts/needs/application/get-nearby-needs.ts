import { NeedRepository } from '../domain/ports/need.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { haversineMeters } from '../../../shared/domain/geo-distance';
import { NeedView, toPublicNeedView } from './need-view';

export interface NearbyNeedView extends NeedView {
  distanceMeters: number;
}

export interface GetNearbyNeedsQuery {
  emergencyId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  limit: number;
}

/**
 * Returns validated needs near a citizen's (ephemeral) location, ordered by
 * proximity (#57).
 *
 * Privacy: the repository filters and orders by the exact stored coordinates
 * (efficient, correct "nearby" gate), but the distance EXPOSED to the public is
 * recomputed from the public view coordinates — which are jittered when the
 * need's locationSensitivity is "approximate". This prevents the exact location
 * of a sensitive requester from being triangulated from an exact distance.
 */
export class GetNearbyNeeds {
  constructor(private readonly repo: NeedRepository) {}

  async execute(q: GetNearbyNeedsQuery): Promise<{ items: NearbyNeedView[] }> {
    const results = await this.repo.findNearbyValidated(
      EmergencyId.fromString(q.emergencyId),
      { lat: q.lat, lng: q.lng, radiusMeters: q.radiusMeters, limit: q.limit },
    );
    return {
      items: results.map((r) => {
        const view = toPublicNeedView(r.need);
        const distanceMeters = Math.round(
          haversineMeters(
            q.lat,
            q.lng,
            view.location.latitude,
            view.location.longitude,
          ),
        );
        return { ...view, distanceMeters };
      }),
    };
  }
}
