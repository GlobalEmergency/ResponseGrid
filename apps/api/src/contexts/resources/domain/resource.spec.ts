import { Resource } from './resource';
import { ResourceId } from './resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from './resource-enums';
import { Location } from '../../../shared/domain/location';
import {
  ResourceAlreadyPublishedError,
  ResourceNotVerifiedError,
  InvalidVerificationLevelError,
  InvalidPublicStatusTransitionError,
  ResourceNotPublishedError,
} from './resource-errors';

const makeLocation = () =>
  Location.create({
    address: 'Calle Mayor 1, Valencia',
    latitude: 39.4699,
    longitude: -0.3763,
  });

const make = () =>
  Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString('11111111-1111-4111-8111-111111111111'),
    type: ResourceType.Warehouse,
    stage: ResourceStage.Origin,
    name: 'Almacén Centro',
    location: makeLocation(),
    ownerUserId: 'user-abc-123',
  });

describe('Resource', () => {
  it('registers as unverified and hidden, emitting ResourceRegistered', () => {
    const r = make();
    expect(r.verificationLevel).toBe(VerificationLevel.Unverified);
    expect(r.publicStatus).toBe(PublicStatus.Hidden);
    const events = r.pullDomainEvents();
    expect(events.map((e) => e.eventName)).toEqual(['resource.registered']);
    expect(r.pullDomainEvents()).toEqual([]); // buffer drained
  });

  it('stores stage, location, ownerUserId and optional ownerOrganizationId', () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(
        '11111111-1111-4111-8111-111111111111',
      ),
      type: ResourceType.CollectionAndDelivery,
      stage: ResourceStage.Intermediate,
      name: 'Punto Mixto',
      description: 'Punto de recogida y entrega intermedio',
      location: makeLocation(),
      ownerUserId: 'user-xyz-456',
      ownerOrganizationId: 'org-789',
    });
    expect(r.stage).toBe(ResourceStage.Intermediate);
    expect(r.location.address).toBe('Calle Mayor 1, Valencia');
    expect(r.ownerUserId).toBe('user-xyz-456');
    expect(r.ownerOrganizationId).toBe('org-789');
    expect(r.description).toBe('Punto de recogida y entrega intermedio');
    expect(r.type).toBe(ResourceType.CollectionAndDelivery);
  });

  it('ownerOrganizationId defaults to null when not provided', () => {
    const r = make();
    expect(r.ownerOrganizationId).toBeNull();
    expect(r.description).toBeNull();
  });

  it('verifies and emits ResourceVerified but stays hidden (registrar ≠ publicar)', () => {
    const r = make();
    r.pullDomainEvents();
    r.verify(VerificationLevel.Verified, 'coord-1');
    expect(r.verificationLevel).toBe(VerificationLevel.Verified);
    expect(r.publicStatus).toBe(PublicStatus.Hidden);
    expect(r.pullDomainEvents().map((e) => e.eventName)).toEqual([
      'resource.verified',
    ]);
  });

  it('rejects verifying with the unverified level', () => {
    const r = make();
    expect(() => r.verify(VerificationLevel.Unverified, 'coord-1')).toThrow(
      InvalidVerificationLevelError,
    );
  });

  it('publishes only after verification', () => {
    const r = make();
    expect(() => r.publish()).toThrow(ResourceNotVerifiedError);
    r.verify(VerificationLevel.Official, 'coord-1');
    r.pullDomainEvents();
    r.publish();
    expect(r.publicStatus).toBe(PublicStatus.Active);
    expect(r.pullDomainEvents().map((e) => e.eventName)).toEqual([
      'resource.published',
    ]);
  });

  it('throws ResourceAlreadyPublishedError when publishing a second time (bug fix)', () => {
    const r = make();
    r.verify(VerificationLevel.Verified, 'coord-1');
    r.publish();
    expect(() => r.publish()).toThrow(ResourceAlreadyPublishedError);
  });

  it('does not emit ResourcePublished on second publish attempt (bug fix)', () => {
    const r = make();
    r.verify(VerificationLevel.Verified, 'coord-1');
    r.publish();
    r.pullDomainEvents(); // drain
    expect(() => r.publish()).toThrow(ResourceAlreadyPublishedError);
    expect(r.pullDomainEvents()).toHaveLength(0);
    // publicStatus must remain Active, not reset
    expect(r.publicStatus).toBe(PublicStatus.Active);
  });

  describe('changePublicStatus', () => {
    const makePublished = () => {
      const r = make();
      r.verify(VerificationLevel.Verified, 'c1');
      r.publish();
      r.pullDomainEvents();
      return r;
    };

    it('transitions Active → Saturated', () => {
      const r = makePublished();
      r.changePublicStatus(PublicStatus.Saturated);
      expect(r.publicStatus).toBe(PublicStatus.Saturated);
    });

    it('transitions Active → Paused', () => {
      const r = makePublished();
      r.changePublicStatus(PublicStatus.Paused);
      expect(r.publicStatus).toBe(PublicStatus.Paused);
    });

    it('transitions Active → Closed', () => {
      const r = makePublished();
      r.changePublicStatus(PublicStatus.Closed);
      expect(r.publicStatus).toBe(PublicStatus.Closed);
    });

    it('reopens: Closed → Active', () => {
      const r = makePublished();
      r.changePublicStatus(PublicStatus.Closed);
      r.changePublicStatus(PublicStatus.Active);
      expect(r.publicStatus).toBe(PublicStatus.Active);
    });

    it('transitions Saturated → Paused', () => {
      const r = makePublished();
      r.changePublicStatus(PublicStatus.Saturated);
      r.changePublicStatus(PublicStatus.Paused);
      expect(r.publicStatus).toBe(PublicStatus.Paused);
    });

    it('throws ResourceNotPublishedError when source is Hidden', () => {
      const r = make();
      expect(() => r.changePublicStatus(PublicStatus.Active)).toThrow(
        ResourceNotPublishedError,
      );
    });

    it('throws InvalidPublicStatusTransitionError when target is Hidden', () => {
      const r = makePublished();
      expect(() => r.changePublicStatus(PublicStatus.Hidden)).toThrow(
        InvalidPublicStatusTransitionError,
      );
    });
  });

  it('toSnapshot / fromSnapshot round-trip preserves all fields', () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(
        '11111111-1111-4111-8111-111111111111',
      ),
      type: ResourceType.Transport,
      stage: ResourceStage.Destination,
      name: 'Camión',
      description: 'Camión de reparto',
      location: makeLocation(),
      ownerUserId: 'user-roundtrip',
      ownerOrganizationId: 'org-roundtrip',
    });
    const snap = r.toSnapshot();
    const restored = Resource.fromSnapshot(snap);
    expect(restored.stage).toBe(ResourceStage.Destination);
    expect(restored.location.address).toBe('Calle Mayor 1, Valencia');
    expect(restored.ownerUserId).toBe('user-roundtrip');
    expect(restored.ownerOrganizationId).toBe('org-roundtrip');
    expect(restored.description).toBe('Camión de reparto');
  });
});
