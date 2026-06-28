import { InMemoryResourceRepository } from './in-memory-resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
} from '../domain/resource-enums';
import { PublicStatus } from '../domain/resource-enums';
import { Location } from '../../../shared/domain/location';

const EM_A = '11111111-1111-4111-8111-111111111111';
const EM_B = '22222222-2222-4222-8222-222222222222';
const baseLocation = Location.create({
  address: 'Calle Test 1, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
});

const make = (emergencyId: string, name: string) =>
  Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString(emergencyId),
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name,
    location: baseLocation,
    ownerUserId: 'user-test-inmem',
  });

/**
 * Mimics an ingested point (e.g. acopiove.org import): Active + Unverified.
 * Built via fromSnapshot because the domain `publish()` guard forbids
 * publishing an unverified resource — yet ingest writes this state directly,
 * which is exactly how unverified points leaked into the public API (#94).
 */
const makeActiveUnverified = (
  emergencyId: string,
  name: string,
  opts: { accepts?: string[]; country?: string | null } = {},
) =>
  Resource.fromSnapshot({
    id: ResourceId.create().value,
    emergencyId,
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name,
    description: null,
    location: baseLocation.toPlain(),
    ownerUserId: 'ingest',
    ownerOrganizationId: null,
    verificationLevel: VerificationLevel.Unverified,
    publicStatus: PublicStatus.Active,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    contact: null,
    schedule: null,
    manager: null,
    accepts: opts.accepts ?? [],
    country: opts.country ?? null,
    city: null,
    provenance: null,
    isFinalRecipient: false,
    recipientType: null,
    items: [],
  });

describe('InMemoryResourceRepository', () => {
  it('saves and finds by id', async () => {
    const repo = new InMemoryResourceRepository();
    const r = make(EM_A, 'Punto 1');
    await repo.save(r);
    const found = await repo.findById(r.id);
    expect(found?.name).toBe('Punto 1');
  });

  it('findPendingByEmergency returns only unverified rows of that emergency', async () => {
    const repo = new InMemoryResourceRepository();
    const pending = make(EM_A, 'Pending A');
    const verified = make(EM_A, 'Verified A');
    verified.verify(VerificationLevel.Verified, 'c1');
    const otherEmergency = make(EM_B, 'Pending B');
    await repo.save(pending);
    await repo.save(verified);
    await repo.save(otherEmergency);

    const result = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM_A),
    );
    expect(result.map((r) => r.name)).toEqual(['Pending A']);
  });

  it('findActiveByEmergency returns only published resources and excludes them from pending', async () => {
    const repo = new InMemoryResourceRepository();
    const active = make(EM_A, 'Active A');
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();
    const pending = make(EM_A, 'Pending A');
    const otherEmergency = make(EM_B, 'Active B');
    otherEmergency.verify(VerificationLevel.Verified, 'c2');
    otherEmergency.publish();
    await repo.save(active);
    await repo.save(pending);
    await repo.save(otherEmergency);

    const activeResult = await repo.findActiveByEmergency(
      EmergencyId.fromString(EM_A),
    );
    expect(activeResult.map((r) => r.name)).toEqual(['Active A']);
    expect(activeResult[0].publicStatus).toBe(PublicStatus.Active);

    const pendingResult = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM_A),
    );
    expect(pendingResult.map((r) => r.name)).toEqual(['Pending A']);
  });

  describe('findVisiblePaged', () => {
    const makeVisible = (
      emergencyId: string,
      name: string,
      opts: { accepts?: string[]; country?: string } = {},
    ) => {
      const r = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(emergencyId),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name,
        location: baseLocation,
        ownerUserId: 'user-test',
        accepts: opts.accepts ?? [],
        country: opts.country ?? null,
      });
      r.verify(VerificationLevel.Verified, 'c1');
      r.publish();
      return r;
    };

    it('returns paged items and correct total', async () => {
      const repo = new InMemoryResourceRepository();
      for (let i = 1; i <= 5; i++) {
        await repo.save(makeVisible(EM_A, `R${i}`));
      }
      // hidden resource should not appear
      await repo.save(make(EM_A, 'Hidden'));

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM_A),
        { page: 1, limit: 2 },
      );
      expect(items).toHaveLength(2);
      expect(total).toBe(5);
    });

    it('filters by category', async () => {
      const repo = new InMemoryResourceRepository();
      await repo.save(
        makeVisible(EM_A, 'Water', { accepts: ['water', 'food'] }),
      );
      await repo.save(makeVisible(EM_A, 'Food Only', { accepts: ['food'] }));

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM_A),
        { page: 1, limit: 10, category: 'water' },
      );
      expect(total).toBe(1);
      expect(items[0].name).toBe('Water');
    });

    it('filters by country', async () => {
      const repo = new InMemoryResourceRepository();
      await repo.save(makeVisible(EM_A, 'VE Resource', { country: 'VE' }));
      await repo.save(makeVisible(EM_A, 'CO Resource', { country: 'CO' }));

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM_A),
        { page: 1, limit: 10, country: 'VE' },
      );
      expect(total).toBe(1);
      expect(items[0].name).toBe('VE Resource');
    });

    it('excludes active-but-unverified (ingested) points — #94', async () => {
      const repo = new InMemoryResourceRepository();
      await repo.save(makeVisible(EM_A, 'Verified'));
      await repo.save(makeActiveUnverified(EM_A, 'Unverified'));

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM_A),
        { page: 1, limit: 10 },
      );
      expect(total).toBe(1);
      expect(items.map((r) => r.name)).toEqual(['Verified']);
    });
  });

  describe('facets', () => {
    it('counts byCategory, byCountry and total (visible only)', async () => {
      const repo = new InMemoryResourceRepository();
      const makeVis = (
        name: string,
        accepts: string[],
        country: string | null,
      ) => {
        const r = Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM_A),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name,
          location: baseLocation,
          ownerUserId: 'u1',
          accepts,
          country,
        });
        r.verify(VerificationLevel.Verified, 'c1');
        r.publish();
        return r;
      };

      await repo.save(makeVis('R1', ['water', 'food'], 'VE'));
      await repo.save(makeVis('R2', ['water'], 'CO'));
      // hidden should not count
      await repo.save(make(EM_A, 'Hidden'));

      const { byCategory, byCountry, total } = await repo.facets(
        EmergencyId.fromString(EM_A),
      );
      expect(total).toBe(2);
      expect(byCategory['water']).toBe(2);
      expect(byCategory['food']).toBe(1);
      expect(byCountry['VE']).toBe(1);
      expect(byCountry['CO']).toBe(1);
    });

    it('does not count active-but-unverified (ingested) points — #94', async () => {
      const repo = new InMemoryResourceRepository();
      const verified = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(EM_A),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: 'Verified',
        location: baseLocation,
        ownerUserId: 'u1',
        accepts: ['water'],
        country: 'VE',
      });
      verified.verify(VerificationLevel.Verified, 'c1');
      verified.publish();
      await repo.save(verified);
      // Unverified but Active (ingested) — must be invisible to facets.
      await repo.save(
        makeActiveUnverified(EM_A, 'Unverified', {
          accepts: ['clothing'],
          country: 'CO',
        }),
      );

      const { byCategory, byCountry, total } = await repo.facets(
        EmergencyId.fromString(EM_A),
      );
      expect(total).toBe(1);
      expect(byCategory).toEqual({ water: 1 });
      expect(byCategory['clothing']).toBeUndefined();
      expect(byCountry).toEqual({ VE: 1 });
    });
  });
});
