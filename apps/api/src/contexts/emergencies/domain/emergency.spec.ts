import { Emergency } from './emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from './slug';
import { EmergencyStatus } from './emergency-status';

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

  it('exposes the name and country provided at creation', () => {
    const e = makeEmergency();
    expect(e.name).toBe('Terremoto Turquía');
    expect(e.country).toBe('TR');
  });

  it('close() changes status to Closed', () => {
    const e = makeEmergency();
    expect(e.status).toBe(EmergencyStatus.Active);
    e.close();
    expect(e.status).toBe(EmergencyStatus.Closed);
  });

  it('toSnapshot / fromSnapshot round-trips correctly', () => {
    const e = makeEmergency();
    e.close();
    const snap = e.toSnapshot();

    expect(snap.status).toBe(EmergencyStatus.Closed);
    expect(snap.name).toBe('Terremoto Turquía');

    const restored = Emergency.fromSnapshot(snap);
    expect(restored.id.equals(e.id)).toBe(true);
    expect(restored.slug.equals(e.slug)).toBe(true);
    expect(restored.status).toBe(EmergencyStatus.Closed);
    expect(restored.country).toBe('TR');
    expect(restored.createdAt.toISOString()).toBe(e.createdAt.toISOString());
  });
});
