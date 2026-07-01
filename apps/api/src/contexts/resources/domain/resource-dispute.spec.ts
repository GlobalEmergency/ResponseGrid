import { Resource } from './resource';
import { ResourceId } from './resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType, VerificationLevel } from './resource-enums';
import { Location } from '../../../shared/domain/location';
import { ResourceNotDisputableError } from './resource-errors';

const EM = '11111111-1111-4111-8111-111111111111';

const make = (): Resource =>
  Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString(EM),
    type: ResourceType.CollectionPoint,
    name: 'Acopio Centro',
    location: Location.create({
      address: 'Caracas',
      latitude: 10.48,
      longitude: -66.9,
    }),
    ownerUserId: 'owner-1',
  });

const published = (): Resource => {
  const r = make();
  r.verify(VerificationLevel.Verified, 'coord');
  r.publish();
  r.pullDomainEvents(); // drain register/verify/publish
  return r;
};

describe('Resource dispute', () => {
  it('flags a published resource as disputed, emitting resource.disputed', () => {
    const r = published();
    expect(r.disputed).toBe(false);

    r.flagDisputed();

    expect(r.disputed).toBe(true);
    expect(r.disputedAt).toBeInstanceOf(Date);
    expect(r.pullDomainEvents().map((e) => e.eventName)).toEqual([
      'resource.disputed',
    ]);
  });

  it('cannot flag a hidden (unpublished) resource', () => {
    expect(() => make().flagDisputed()).toThrow(ResourceNotDisputableError);
  });

  it('flagDisputed is idempotent: a second flag emits no event and keeps disputedAt', () => {
    const r = published();
    r.flagDisputed();
    const firstAt = r.disputedAt;
    r.pullDomainEvents(); // drain the first resource.disputed

    r.flagDisputed(); // already disputed → no-op

    expect(r.disputed).toBe(true);
    expect(r.disputedAt).toBe(firstAt); // same instant, not reset
    expect(r.pullDomainEvents()).toEqual([]); // no duplicate event
  });

  it('isPubliclyVisible reflects the public status', () => {
    expect(make().isPubliclyVisible()).toBe(false); // hidden
    expect(published().isPubliclyVisible()).toBe(true); // active
  });

  it('clears the dispute, emitting resource.dispute_resolved', () => {
    const r = published();
    r.flagDisputed();
    r.pullDomainEvents();

    r.clearDispute('dismiss');

    expect(r.disputed).toBe(false);
    expect(r.disputedAt).toBeNull();
    expect(r.pullDomainEvents().map((e) => e.eventName)).toEqual([
      'resource.dispute_resolved',
    ]);
  });

  it('markInvalid rejects the resource (removed from public listings)', () => {
    const r = published();
    r.markInvalid();
    expect(r.verificationLevel).toBe(VerificationLevel.Rejected);
  });

  it('carries the disputed flag through a snapshot round-trip', () => {
    const r = published();
    r.flagDisputed();
    const back = Resource.fromSnapshot(r.toSnapshot());
    expect(back.disputed).toBe(true);
    expect(back.disputedAt).toBeInstanceOf(Date);
  });
});
