import { NeedRepository } from '../domain/ports/need.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedView, toPublicNeedView } from './need-view';

/**
 * GetNeedsInBounds — validated needs inside a map viewport bounding box.
 *
 * Mirrors GetResourcesInBounds so the map can load needs for the visible area
 * only (and stay fast when there are hundreds of needs). Coordinates exposed in
 * the view are jittered for "approximate" needs via toPublicNeedView.
 */
export class GetNeedsInBounds {
  constructor(private readonly repo: NeedRepository) {}

  async execute(q: {
    emergencyId: string;
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    limit: number;
  }): Promise<{ items: NeedView[] }> {
    const needs = await this.repo.findValidatedInBounds(
      EmergencyId.fromString(q.emergencyId),
      {
        minLat: q.minLat,
        minLng: q.minLng,
        maxLat: q.maxLat,
        maxLng: q.maxLng,
        limit: q.limit,
      },
    );
    return { items: needs.map(toPublicNeedView) };
  }
}
