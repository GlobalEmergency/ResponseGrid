import { Report } from './report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
} from './report-enums';
import {
  ReportAlreadyReviewedError,
  ReportNotPublishableError,
  ReportNotInReviewedStatusError,
  ReportStructuralDetailRequiredError,
} from './report-errors';
import { Priority } from '../../../shared/domain/priority';

const baseProps = {
  emergencyId: 'em-1111-1111-1111-111111111111',
  reporterUserId: 'usr-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  type: ReportType.Incident,
  note: 'Road blocked near bridge',
  priority: ReportPriority.High,
};

describe('Report aggregate', () => {
  describe('create()', () => {
    it('creates a report with status Open and no reviewedAt', () => {
      const report = Report.create(baseProps);
      expect(report.status).toBe(ReportStatus.Open);
      expect(report.reviewedAt).toBeNull();
    });

    it('generates a unique id', () => {
      const r1 = Report.create(baseProps);
      const r2 = Report.create(baseProps);
      expect(r1.id).not.toBe(r2.id);
    });

    it('defaults photoUrls to empty array when omitted', () => {
      const report = Report.create(baseProps);
      expect(report.photoUrls).toEqual([]);
    });

    it('stores provided photoUrls', () => {
      const urls = [
        'http://example.com/photo1.jpg',
        'http://example.com/photo2.jpg',
      ];
      const report = Report.create({ ...baseProps, photoUrls: urls });
      expect(report.photoUrls).toEqual(urls);
    });

    it('stores optional resourceId', () => {
      const resourceId = 'res-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const report = Report.create({ ...baseProps, resourceId });
      expect(report.resourceId).toBe(resourceId);
    });

    it('stores null resourceId when omitted', () => {
      const report = Report.create(baseProps);
      expect(report.resourceId).toBeNull();
    });

    it('stores location when provided', () => {
      const location = {
        address: 'Plaza España, Valencia',
        latitude: 39.4699,
        longitude: -0.3763,
      };
      const report = Report.create({ ...baseProps, location });
      expect(report.location?.toPlain()).toEqual(location);
    });

    it('stores null location when omitted', () => {
      const report = Report.create(baseProps);
      expect(report.location).toBeNull();
    });

    it('records emergencyId, reporterUserId, type, note, priority', () => {
      const report = Report.create(baseProps);
      expect(report.emergencyId).toBe(baseProps.emergencyId);
      expect(report.reporterUserId).toBe(baseProps.reporterUserId);
      expect(report.type).toBe(ReportType.Incident);
      expect(report.note).toBe(baseProps.note);
      expect(report.priority).toBe(ReportPriority.High);
    });

    // Structural SAR tests
    it('auto-elevates priority to urgent for trapped_persons type', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.TrappedPersons,
        priority: ReportPriority.Low,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: 3,
          accessibleForRescue: true,
          buildingType: 'residential',
        },
      });
      expect(report.priority).toBe(Priority.Urgent);
    });

    it('auto-elevates priority to urgent for collapsed damage level', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        priority: ReportPriority.Medium,
        structuralDetail: {
          damageLevel: DamageLevel.Collapsed,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      expect(report.priority).toBe(Priority.Urgent);
    });

    it('does NOT auto-elevate priority for severe damage without trapped_persons type', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        priority: ReportPriority.Medium,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      expect(report.priority).toBe(ReportPriority.Medium);
    });

    it('keeps high priority already set if not auto-elevated', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        priority: ReportPriority.High,
        structuralDetail: {
          damageLevel: DamageLevel.Moderate,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      expect(report.priority).toBe(ReportPriority.High);
    });

    it('stores structural detail for structural_damage type', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: 2,
          accessibleForRescue: false,
          buildingType: 'hospital',
        },
      });
      expect(report.damageLevel).toBe(DamageLevel.Severe);
      expect(report.trappedPersonsEstimate).toBe(2);
      expect(report.accessibleForRescue).toBe(false);
      expect(report.buildingType).toBe('hospital');
    });

    it('stores null structural fields for non-structural types', () => {
      const report = Report.create(baseProps);
      expect(report.damageLevel).toBeNull();
      expect(report.trappedPersonsEstimate).toBeNull();
      expect(report.accessibleForRescue).toBeNull();
      expect(report.buildingType).toBeNull();
    });

    it('throws ReportStructuralDetailRequiredError when structuralDetail provided for non-structural type', () => {
      expect(() =>
        Report.create({
          ...baseProps,
          type: ReportType.Incident,
          structuralDetail: {
            damageLevel: DamageLevel.Moderate,
            trappedPersonsEstimate: null,
            accessibleForRescue: null,
            buildingType: null,
          },
        }),
      ).toThrow(ReportStructuralDetailRequiredError);
    });
  });

  describe('markReviewed()', () => {
    it('transitions status from Open to Reviewed', () => {
      const report = Report.create(baseProps);
      report.markReviewed();
      expect(report.status).toBe(ReportStatus.Reviewed);
    });

    it('sets reviewedAt to a date', () => {
      const report = Report.create(baseProps);
      const before = new Date();
      report.markReviewed();
      const after = new Date();
      expect(report.reviewedAt).toBeDefined();
      expect(report.reviewedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(report.reviewedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('throws ReportAlreadyReviewedError when already reviewed', () => {
      const report = Report.create(baseProps);
      report.markReviewed();
      expect(() => report.markReviewed()).toThrow(ReportAlreadyReviewedError);
    });
  });

  describe('publish()', () => {
    it('transitions status from Reviewed to Published', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      report.markReviewed();
      report.publish('Confirmed damage, SAR team dispatched');
      expect(report.status).toBe(ReportStatus.Published);
      expect(report.publishNote).toBe('Confirmed damage, SAR team dispatched');
      expect(report.publishedAt).not.toBeNull();
    });

    it('sets publishedAt to current date', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.TrappedPersons,
        structuralDetail: {
          damageLevel: DamageLevel.Collapsed,
          trappedPersonsEstimate: 4,
          accessibleForRescue: true,
          buildingType: null,
        },
      });
      report.markReviewed();
      const before = new Date();
      report.publish();
      const after = new Date();
      expect(report.publishedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(report.publishedAt!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('throws ReportNotInReviewedStatusError when publishing from Open status', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Moderate,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      expect(() => report.publish()).toThrow(ReportNotInReviewedStatusError);
    });

    it('throws ReportNotPublishableError when already published', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      report.markReviewed();
      report.publish();
      expect(() => report.publish()).toThrow(ReportNotPublishableError);
    });

    it('allows publish with no publishNote (nullable)', () => {
      const report = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Moderate,
          trappedPersonsEstimate: null,
          accessibleForRescue: null,
          buildingType: null,
        },
      });
      report.markReviewed();
      report.publish();
      expect(report.publishNote).toBeNull();
      expect(report.status).toBe(ReportStatus.Published);
    });
  });

  describe('fromSnapshot() / toSnapshot()', () => {
    it('round-trips through snapshot', () => {
      const original = Report.create({
        ...baseProps,
        photoUrls: ['http://example.com/a.jpg'],
        resourceId: 'res-1234',
        location: { address: 'Test street', latitude: 40.0, longitude: -3.0 },
      });
      original.markReviewed();
      const snapshot = original.toSnapshot();
      const restored = Report.fromSnapshot(snapshot);
      expect(restored.id).toBe(original.id);
      expect(restored.status).toBe(ReportStatus.Reviewed);
      expect(restored.reviewedAt).toEqual(original.reviewedAt);
      expect(restored.photoUrls).toEqual(['http://example.com/a.jpg']);
      expect(restored.location?.toPlain().address).toBe('Test street');
    });

    it('round-trips structural fields through snapshot', () => {
      const original = Report.create({
        ...baseProps,
        type: ReportType.StructuralDamage,
        structuralDetail: {
          damageLevel: DamageLevel.Severe,
          trappedPersonsEstimate: 3,
          accessibleForRescue: true,
          buildingType: 'school',
        },
      });
      original.markReviewed();
      original.publish('Verified — school partially collapsed');
      const snapshot = original.toSnapshot();
      const restored = Report.fromSnapshot(snapshot);
      expect(restored.damageLevel).toBe(DamageLevel.Severe);
      expect(restored.trappedPersonsEstimate).toBe(3);
      expect(restored.accessibleForRescue).toBe(true);
      expect(restored.buildingType).toBe('school');
      expect(restored.status).toBe(ReportStatus.Published);
      expect(restored.publishNote).toBe(
        'Verified — school partially collapsed',
      );
      expect(restored.publishedAt).not.toBeNull();
    });
  });
});
