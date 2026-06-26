import { Emergency } from './emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from './slug';
import { EmergencyStatus } from './emergency-status';
import { InvalidEmergencyTransitionError } from './invalid-emergency-transition.error';

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

  it('toSnapshot / fromSnapshot round-trips correctly with new fields', () => {
    const e = makeEmergency();
    e.pause();
    e.publishAnnouncement('Round-trip test');
    const snap = e.toSnapshot();

    expect(snap.status).toBe(EmergencyStatus.Paused);
    expect(snap.announcement).toBe('Round-trip test');
    expect(snap.updatedAt).toBeInstanceOf(Date);

    const restored = Emergency.fromSnapshot(snap);
    expect(restored.id.equals(e.id)).toBe(true);
    expect(restored.slug.equals(e.slug)).toBe(true);
    expect(restored.status).toBe(EmergencyStatus.Paused);
    expect(restored.announcement).toBe('Round-trip test');
    expect(restored.updatedAt.toISOString()).toBe(e.updatedAt.toISOString());
    expect(restored.country).toBe('TR');
    expect(restored.createdAt.toISOString()).toBe(e.createdAt.toISOString());
  });
});
