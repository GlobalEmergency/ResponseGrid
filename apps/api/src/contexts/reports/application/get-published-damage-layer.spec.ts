import { GetPublishedDamageLayer } from './get-published-damage-layer';
import { ReportRepository } from '../domain/ports/report.repository';
import { Report } from '../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
} from '../domain/report-enums';

const EM = 'em-1111-1111-1111-111111111111';

function makeRepo(reports: Report[] = []): ReportRepository {
  const store = new Map<string, Report>(reports.map((r) => [r.id, r]));
  return {
    save(r: Report): Promise<void> {
      store.set(r.id, r);
      return Promise.resolve();
    },
    findById(id: string): Promise<Report | null> {
      return Promise.resolve(store.get(id) ?? null);
    },
    findByEmergencyId(emergencyId: string): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter((r) => r.emergencyId === emergencyId),
      );
    },
    findByEmergencyIdAndReporter(
      emergencyId: string,
      uid: string,
    ): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter(
          (r) => r.emergencyId === emergencyId && r.reporterUserId === uid,
        ),
      );
    },
    findPublishedStructuralByEmergencyId(
      emergencyId: string,
    ): Promise<Report[]> {
      return Promise.resolve(
        [...store.values()].filter(
          (r) =>
            r.emergencyId === emergencyId &&
            r.status === ReportStatus.Published,
        ),
      );
    },
  };
}

function makePublishedStructuralReport(
  overrides: Partial<{
    type: ReportType;
    damageLevel: DamageLevel;
    photoUrls: string[];
    publishNote: string;
  }> = {},
): Report {
  const report = Report.create({
    emergencyId: EM,
    reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    type: overrides.type ?? ReportType.StructuralDamage,
    note: 'Building partially collapsed',
    priority: ReportPriority.High,
    photoUrls: overrides.photoUrls ?? [],
    location: { address: 'Calle Rescate 1', latitude: 39.47, longitude: -0.38 },
    structuralDetail: {
      damageLevel: overrides.damageLevel ?? DamageLevel.Severe,
      trappedPersonsEstimate: 3,
      accessibleForRescue: true,
      buildingType: 'residential',
    },
  });
  report.markReviewed();
  report.publish(overrides.publishNote ?? 'Confirmed');
  return report;
}

describe('GetPublishedDamageLayer', () => {
  it('returns a GeoJSON FeatureCollection with published structural reports', async () => {
    const published = makePublishedStructuralReport();
    const repo = makeRepo([published]);
    const uc = new GetPublishedDamageLayer(repo);

    const result = await uc.execute({ emergencyId: EM });

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe('Feature');
    expect(result.features[0].geometry?.type).toBe('Point');
    expect(result.features[0].geometry?.coordinates).toEqual([-0.38, 39.47]);
    expect(result.features[0].properties.id).toBe(published.id);
    expect(result.features[0].properties.damageLevel).toBe(DamageLevel.Severe);
    expect(result.features[0].properties.trappedPersonsEstimate).toBe(3);
  });

  it('returns empty FeatureCollection when no published reports', async () => {
    const repo = makeRepo([]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(0);
  });

  it('does NOT include reporterUserId in the properties (privacy)', async () => {
    const published = makePublishedStructuralReport();
    const repo = makeRepo([published]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    const props = result.features[0].properties;
    expect('reporterUserId' in props).toBe(false);
  });

  it('exposes only first photo as thumbnailUrl', async () => {
    const published = makePublishedStructuralReport({
      photoUrls: ['/files/a.jpg', '/files/b.jpg'],
    });
    const repo = makeRepo([published]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    expect(result.features[0].properties.thumbnailUrl).toBe('/files/a.jpg');
  });

  it('sets thumbnailUrl to null when no photos', async () => {
    const published = makePublishedStructuralReport({ photoUrls: [] });
    const repo = makeRepo([published]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    expect(result.features[0].properties.thumbnailUrl).toBeNull();
  });

  it('sets geometry to null when report has no location', async () => {
    const report = Report.create({
      emergencyId: EM,
      reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'No location',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Moderate,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    report.markReviewed();
    report.publish();
    const repo = makeRepo([report]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    expect(result.features[0].geometry).toBeNull();
  });

  it('excludes open or reviewed (non-published) reports', async () => {
    const openReport = Report.create({
      emergencyId: EM,
      reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'Not yet reviewed',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Moderate,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    const reviewedReport = Report.create({
      emergencyId: EM,
      reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      type: ReportType.StructuralDamage,
      note: 'Reviewed but not published',
      priority: ReportPriority.High,
      structuralDetail: {
        damageLevel: DamageLevel.Severe,
        trappedPersonsEstimate: null,
        accessibleForRescue: null,
        buildingType: null,
      },
    });
    reviewedReport.markReviewed();

    const repo = makeRepo([openReport, reviewedReport]);
    const uc = new GetPublishedDamageLayer(repo);
    const result = await uc.execute({ emergencyId: EM });
    expect(result.features).toHaveLength(0);
  });
});
