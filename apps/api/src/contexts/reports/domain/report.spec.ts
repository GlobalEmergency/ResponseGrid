import { Report } from './report';
import { ReportType, ReportPriority, ReportStatus } from './report-enums';
import { ReportAlreadyReviewedError } from './report-errors';

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
  });
});
