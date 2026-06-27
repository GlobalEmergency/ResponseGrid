import { MissingPersonReport } from './missing-person-report';
import { MissingPersonReportId } from './missing-person-report-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { MissingPersonStatus } from './missing-person-status';
import { SightingId } from './sighting-id';
import {
  ConsentRequiredError,
  SightingsClosedError,
} from './missing-person-report-errors';
import { InvalidStatusTransitionError } from './missing-person-status';

const BASE_PERSON = {
  firstName: 'María',
  lastName: 'García',
  documentId: null,
  approximateAge: 42,
  lastKnownLocation: 'Calle Mayor 10, Valencia',
  lastKnownCoords: null,
  description: null,
};

const BASE_REPORTER = {
  userId: null,
  name: 'Juan García',
  phone: '+34 600 123 456',
  email: null,
};

const BASE_PROPS = {
  id: MissingPersonReportId.create(),
  emergencyId: EmergencyId.fromString('aaaaaaaa-0000-4000-8000-000000000001'),
  person: BASE_PERSON,
  reporter: BASE_REPORTER,
  consentGiven: true,
};

describe('MissingPersonReport — domain', () => {
  describe('create', () => {
    it('creates a report in Open status when consent is given', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      expect(report.status).toBe(MissingPersonStatus.Open);
      expect(report.consentGiven).toBe(true);
      expect(report.sightings).toHaveLength(0);
      expect(report.photoUrl).toBeNull();
    });

    it('throws ConsentRequiredError when consentGiven is false', () => {
      expect(() =>
        MissingPersonReport.create({ ...BASE_PROPS, consentGiven: false }),
      ).toThrow(ConsentRequiredError);
    });

    it('normalizes documentId to uppercase', () => {
      const report = MissingPersonReport.create({
        ...BASE_PROPS,
        person: { ...BASE_PERSON, documentId: 'abc-123' },
      });
      expect(report.person.documentId).toBe('ABC-123');
    });
  });

  describe('addSighting', () => {
    it('adds a sighting to an open report', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.addSighting({
        id: SightingId.create(),
        reportedByUserId: 'user-abc',
        reportedByName: null,
        location: 'Parque Central',
        coords: null,
        note: 'Vi a alguien con esa descripción',
      });
      expect(report.sightings).toHaveLength(1);
    });

    it('adds a sighting to an under_review report', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.UnderReview, 'coordinator-id');
      report.addSighting({
        id: SightingId.create(),
        reportedByUserId: null,
        reportedByName: 'Anónimo',
        location: 'Mercado',
        coords: null,
        note: 'Avistamiento posible',
      });
      expect(report.sightings).toHaveLength(1);
    });

    it('throws SightingsClosedError when report is matched', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.UnderReview, 'coord');
      report.updateStatus(MissingPersonStatus.Matched, 'coord', 'Encontrada');
      expect(() =>
        report.addSighting({
          id: SightingId.create(),
          reportedByUserId: 'user',
          reportedByName: null,
          location: 'x',
          coords: null,
          note: 'x',
        }),
      ).toThrow(SightingsClosedError);
    });

    it('throws SightingsClosedError when report is closed', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.Closed, 'coord');
      expect(() =>
        report.addSighting({
          id: SightingId.create(),
          reportedByUserId: 'user',
          reportedByName: null,
          location: 'x',
          coords: null,
          note: 'x',
        }),
      ).toThrow(SightingsClosedError);
    });
  });

  describe('updateStatus', () => {
    it('transitions from open to under_review', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.UnderReview, 'coord-id');
      expect(report.status).toBe(MissingPersonStatus.UnderReview);
      expect(report.reviewedByUserId).toBe('coord-id');
    });

    it('transitions from under_review to matched with a note', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.UnderReview, 'coord-id');
      report.updateStatus(
        MissingPersonStatus.Matched,
        'coord-id',
        'Familia localizada',
      );
      expect(report.status).toBe(MissingPersonStatus.Matched);
      expect(report.matchNote).toBe('Familia localizada');
    });

    it('transitions from matched to closed', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.UnderReview, 'coord');
      report.updateStatus(MissingPersonStatus.Matched, 'coord');
      report.updateStatus(MissingPersonStatus.Closed, 'coord');
      expect(report.status).toBe(MissingPersonStatus.Closed);
    });

    it('throws InvalidStatusTransitionError for invalid transitions', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      expect(() =>
        report.updateStatus(MissingPersonStatus.Matched, 'coord'),
      ).toThrow(InvalidStatusTransitionError);
    });

    it('throws InvalidStatusTransitionError transitioning from closed', () => {
      const report = MissingPersonReport.create(BASE_PROPS);
      report.updateStatus(MissingPersonStatus.Closed, 'coord');
      expect(() =>
        report.updateStatus(MissingPersonStatus.Open, 'coord'),
      ).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('fromSnapshot / toSnapshot round-trip', () => {
    it('preserves all fields across snapshot round-trip', () => {
      const report = MissingPersonReport.create({
        ...BASE_PROPS,
        person: { ...BASE_PERSON, documentId: 'abc123' },
        reporter: { ...BASE_REPORTER, email: 'juan@example.com', userId: 'u1' },
      });
      report.addSighting({
        id: SightingId.create(),
        reportedByUserId: 'u2',
        reportedByName: null,
        location: 'Plaza Mayor',
        coords: null,
        note: 'Avistado',
      });
      const snapshot = report.toSnapshot();
      const restored = MissingPersonReport.fromSnapshot(snapshot);
      expect(restored.id.value).toBe(report.id.value);
      expect(restored.status).toBe(MissingPersonStatus.Open);
      expect(restored.sightings).toHaveLength(1);
      expect(restored.reporter.email).toBe('juan@example.com');
      expect(restored.person.documentId).toBe('ABC123');
    });
  });
});
