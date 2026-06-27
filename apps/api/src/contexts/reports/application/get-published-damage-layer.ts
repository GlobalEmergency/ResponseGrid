import { ReportRepository } from '../domain/ports/report.repository';
import { DamageLevel, ReportType } from '../domain/report-enums';

export interface GetPublishedDamageLayerQuery {
  emergencyId: string;
}

export interface DamageFeatureProperties {
  id: string;
  type: ReportType;
  damageLevel: DamageLevel | null;
  trappedPersonsEstimate: number | null;
  publishNote: string | null;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
}

export interface DamageFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  properties: DamageFeatureProperties;
}

export interface DamageFeatureCollection {
  type: 'FeatureCollection';
  features: DamageFeature[];
}

export class GetPublishedDamageLayer {
  constructor(private readonly repo: ReportRepository) {}

  async execute(
    query: GetPublishedDamageLayerQuery,
  ): Promise<DamageFeatureCollection> {
    const reports = await this.repo.findPublishedStructuralByEmergencyId(
      query.emergencyId,
    );

    const features: DamageFeature[] = reports.map((report) => {
      const snap = report.toSnapshot();
      return {
        type: 'Feature' as const,
        geometry:
          snap.location !== null
            ? {
                type: 'Point' as const,
                coordinates: [
                  snap.location.longitude,
                  snap.location.latitude,
                ] as [number, number],
              }
            : null,
        properties: {
          id: snap.id,
          type: snap.type,
          damageLevel: snap.damageLevel,
          trappedPersonsEstimate: snap.trappedPersonsEstimate,
          publishNote: snap.publishNote,
          publishedAt: snap.publishedAt,
          thumbnailUrl: snap.photoUrls.length > 0 ? snap.photoUrls[0] : null,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
