import { Resource } from './resource';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
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
  FinalRecipientMustBeDestinationError,
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

  it('defaults to an empty inventory and carries declared items through a snapshot', () => {
    expect(make().items).toEqual([]);

    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(
        '11111111-1111-4111-8111-111111111111',
      ),
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén con stock',
      location: makeLocation(),
      ownerUserId: 'user-abc-123',
      items: [
        SupplyLine.create({
          name: 'Agua',
          quantity: 100,
          unit: 'litros',
          category: Category.Water,
        }),
      ],
    });

    expect(r.items).toHaveLength(1);
    const restored = Resource.fromSnapshot(r.toSnapshot());
    expect(restored.items[0].toSnapshot()).toEqual({
      name: 'Agua',
      quantity: 100,
      unit: 'litros',
      category: Category.Water,
      presentation: null,
    });
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

  describe('enriched fields (Task 2)', () => {
    it('exposes accepts, contact, provenance and geo fields when provided', () => {
      const externalUpdatedAt = new Date('2026-06-27T00:00:00Z');
      const r = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(
          '11111111-1111-4111-8111-111111111111',
        ),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Acopio Venezuela',
        location: makeLocation(),
        ownerUserId: 'user-enrich',
        accepts: ['water', 'food'],
        contact: '+58 212 555 0000',
        schedule: 'Lun-Vie 08-18',
        manager: 'Juan Pérez',
        country: 'VE',
        city: 'Caracas',
        provenance: {
          sourceName: 'acopiove.org',
          externalId: 'abc123',
          externalUpdatedAt,
          raw: { a: 1 },
        },
      });

      expect(r.accepts).toEqual(['water', 'food']);
      expect(r.contact).toBe('+58 212 555 0000');
      expect(r.schedule).toBe('Lun-Vie 08-18');
      expect(r.manager).toBe('Juan Pérez');
      expect(r.country).toBe('VE');
      expect(r.city).toBe('Caracas');
      expect(r.provenance).toEqual({
        sourceName: 'acopiove.org',
        externalId: 'abc123',
        externalUpdatedAt,
        raw: { a: 1 },
      });
    });

    it('defaults accepts to [] and all other enriched fields to null when not provided', () => {
      const r = make();
      expect(r.accepts).toEqual([]);
      expect(r.contact).toBeNull();
      expect(r.schedule).toBeNull();
      expect(r.manager).toBeNull();
      expect(r.country).toBeNull();
      expect(r.city).toBeNull();
      expect(r.provenance).toBeNull();
    });

    it('toSnapshot / fromSnapshot round-trip preserves enriched fields', () => {
      const externalUpdatedAt = new Date('2026-06-27T00:00:00Z');
      const r = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(
          '11111111-1111-4111-8111-111111111111',
        ),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Snapshot Enrich',
        location: makeLocation(),
        ownerUserId: 'user-snap-enrich',
        accepts: ['tools'],
        contact: 'snap@contact.com',
        country: 'ES',
        city: 'Madrid',
        provenance: {
          sourceName: 'snap-source',
          externalId: 'snap-ext-1',
          externalUpdatedAt,
          raw: { x: 42 },
        },
      });

      const snap = r.toSnapshot();
      const restored = Resource.fromSnapshot(snap);

      expect(restored.accepts).toEqual(['tools']);
      expect(restored.contact).toBe('snap@contact.com');
      expect(restored.country).toBe('ES');
      expect(restored.city).toBe('Madrid');
      expect(restored.provenance?.sourceName).toBe('snap-source');
      expect(restored.provenance?.externalId).toBe('snap-ext-1');
      expect(restored.provenance?.externalUpdatedAt).toEqual(externalUpdatedAt);
      expect(restored.provenance?.raw).toEqual({ x: 42 });
    });
  });

  describe('destinatario final (#60)', () => {
    const makeRecipient = (recipientType: string | null = 'hospital') =>
      Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(
          '11111111-1111-4111-8111-111111111111',
        ),
        type: ResourceType.Venue,
        stage: ResourceStage.Destination,
        name: 'Hospital Central',
        location: makeLocation(),
        ownerUserId: 'user-recipient',
        isFinalRecipient: true,
        recipientType,
      });

    it('marks a destination-stage resource as a final recipient with a type', () => {
      const r = makeRecipient('hospital');
      expect(r.isFinalRecipient).toBe(true);
      expect(r.recipientType).toBe('hospital');
    });

    it('defaults isFinalRecipient to false and recipientType to null', () => {
      const r = make();
      expect(r.isFinalRecipient).toBe(false);
      expect(r.recipientType).toBeNull();
    });

    it('rejects a final recipient that is not at the destination stage', () => {
      expect(() =>
        Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(
            '11111111-1111-4111-8111-111111111111',
          ),
          type: ResourceType.Venue,
          stage: ResourceStage.Origin,
          name: 'No-destino',
          location: makeLocation(),
          ownerUserId: 'user-bad',
          isFinalRecipient: true,
        }),
      ).toThrow(FinalRecipientMustBeDestinationError);
    });

    it('toSnapshot / fromSnapshot round-trip preserves the recipient role', () => {
      const r = makeRecipient('empresa');
      const restored = Resource.fromSnapshot(r.toSnapshot());
      expect(restored.isFinalRecipient).toBe(true);
      expect(restored.recipientType).toBe('empresa');
    });
  });
});
