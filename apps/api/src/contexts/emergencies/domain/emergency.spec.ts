import { Emergency } from './emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from './slug';
import { EmergencyStatus } from './emergency-status';
import { InvalidEmergencyTransitionError } from './invalid-emergency-transition.error';
import {
  InvalidDisputeThresholdError,
  MAX_RESOURCE_DISPUTE_THRESHOLD,
} from './invalid-dispute-threshold.error';

const makeEmergency = () =>
  Emergency.create({
    id: EmergencyId.create(),
    name: 'Terremoto Turquía',
    slug: Slug.fromString('terremoto-turquia'),
    country: 'TR',
  });

describe('Emergency', () => {
  it('creates with Active status and a createdAt date', () => {
    const before = new Date();
    const e = makeEmergency();
    const after = new Date();

    expect(e.status).toBe(EmergencyStatus.Active);
    expect(e.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(e.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('creates with null announcement and updatedAt equal to createdAt', () => {
    const e = makeEmergency();
    expect(e.announcement).toBeNull();
    expect(e.updatedAt.toISOString()).toBe(e.createdAt.toISOString());
  });

  it('exposes the name and country provided at creation', () => {
    const e = makeEmergency();
    expect(e.name).toBe('Terremoto Turquía');
    expect(e.country).toBe('TR');
  });

  it('close() changes status to Closed and updates updatedAt', () => {
    const e = makeEmergency();
    const before = new Date();
    e.close();
    expect(e.status).toBe(EmergencyStatus.Closed);
    expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  describe('pause()', () => {
    it('transitions Active → Paused and updates updatedAt', () => {
      const e = makeEmergency();
      const before = new Date();
      e.pause();
      expect(e.status).toBe(EmergencyStatus.Paused);
      expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('throws InvalidEmergencyTransitionError when already Paused', () => {
      const e = makeEmergency();
      e.pause();
      expect(() => e.pause()).toThrow(InvalidEmergencyTransitionError);
      expect(() => e.pause()).toThrow(
        "Cannot transition emergency from 'paused' to 'paused'",
      );
    });

    it('throws InvalidEmergencyTransitionError when Closed', () => {
      const e = makeEmergency();
      e.close();
      expect(() => e.pause()).toThrow(InvalidEmergencyTransitionError);
    });
  });

  describe('resume()', () => {
    it('transitions Paused → Active and updates updatedAt', () => {
      const e = makeEmergency();
      e.pause();
      const before = new Date();
      e.resume();
      expect(e.status).toBe(EmergencyStatus.Active);
      expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('throws InvalidEmergencyTransitionError when Active', () => {
      const e = makeEmergency();
      expect(() => e.resume()).toThrow(InvalidEmergencyTransitionError);
      expect(() => e.resume()).toThrow(
        "Cannot transition emergency from 'active' to 'active'",
      );
    });

    it('throws InvalidEmergencyTransitionError when Closed', () => {
      const e = makeEmergency();
      e.close();
      expect(() => e.resume()).toThrow(InvalidEmergencyTransitionError);
    });
  });

  describe('publishAnnouncement()', () => {
    it('sets the announcement text and updates updatedAt', () => {
      const e = makeEmergency();
      const before = new Date();
      e.publishAnnouncement('Acceso norte cortado');
      expect(e.announcement).toBe('Acceso norte cortado');
      expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('replaces a previous announcement', () => {
      const e = makeEmergency();
      e.publishAnnouncement('First');
      e.publishAnnouncement('Second');
      expect(e.announcement).toBe('Second');
    });

    it('works regardless of emergency status', () => {
      const e = makeEmergency();
      e.pause();
      e.publishAnnouncement('Paused announcement');
      expect(e.announcement).toBe('Paused announcement');
    });
  });

  describe('setResourceDisputeThreshold()', () => {
    it('creates with a null threshold (uses the global default)', () => {
      expect(makeEmergency().resourceDisputeThreshold).toBeNull();
    });

    it('sets a valid positive integer threshold and updates updatedAt', () => {
      const e = makeEmergency();
      const before = new Date();
      e.setResourceDisputeThreshold(5);
      expect(e.resourceDisputeThreshold).toBe(5);
      expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('clears the threshold when set to null', () => {
      const e = makeEmergency();
      e.setResourceDisputeThreshold(5);
      e.setResourceDisputeThreshold(null);
      expect(e.resourceDisputeThreshold).toBeNull();
    });

    it('accepts the upper bound', () => {
      const e = makeEmergency();
      e.setResourceDisputeThreshold(MAX_RESOURCE_DISPUTE_THRESHOLD);
      expect(e.resourceDisputeThreshold).toBe(MAX_RESOURCE_DISPUTE_THRESHOLD);
    });

    it.each([0, -1, 1.5, MAX_RESOURCE_DISPUTE_THRESHOLD + 1])(
      'throws InvalidDisputeThresholdError for %p',
      (bad) => {
        const e = makeEmergency();
        expect(() => e.setResourceDisputeThreshold(bad)).toThrow(
          InvalidDisputeThresholdError,
        );
        // The invalid value must not mutate the aggregate.
        expect(e.resourceDisputeThreshold).toBeNull();
      },
    );
  });

  it('toSnapshot / fromSnapshot round-trips correctly with new fields', () => {
    const e = makeEmergency();
    e.pause();
    e.publishAnnouncement('Round-trip test');
    e.setAutoHideOnDispute(true);
    const snap = e.toSnapshot();

    expect(snap.status).toBe(EmergencyStatus.Paused);
    expect(snap.announcement).toBe('Round-trip test');
    expect(snap.updatedAt).toBeInstanceOf(Date);
    expect(snap.autoHideOnDispute).toBe(true);

    const restored = Emergency.fromSnapshot(snap);
    expect(restored.id.equals(e.id)).toBe(true);
    expect(restored.slug.equals(e.slug)).toBe(true);
    expect(restored.status).toBe(EmergencyStatus.Paused);
    expect(restored.announcement).toBe('Round-trip test');
    expect(restored.updatedAt.toISOString()).toBe(e.updatedAt.toISOString());
    expect(restored.country).toBe('TR');
    expect(restored.createdAt.toISOString()).toBe(e.createdAt.toISOString());
    expect(restored.autoHideOnDispute).toBe(true);
  });

  describe('setAutoHideOnDispute()', () => {
    it('creates with the policy off by default (#171)', () => {
      expect(makeEmergency().autoHideOnDispute).toBe(false);
    });

    it('turns the policy on and updates updatedAt', () => {
      const e = makeEmergency();
      const before = new Date();
      e.setAutoHideOnDispute(true);
      expect(e.autoHideOnDispute).toBe(true);
      expect(e.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('turns the policy back off', () => {
      const e = makeEmergency();
      e.setAutoHideOnDispute(true);
      e.setAutoHideOnDispute(false);
      expect(e.autoHideOnDispute).toBe(false);
    });
  });
});
