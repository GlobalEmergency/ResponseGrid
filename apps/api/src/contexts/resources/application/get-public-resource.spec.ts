import { GetPublicResource } from './get-public-resource';
import { Resource, ResourceSnapshot } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { ResourceRepository } from '../domain/ports/resource.repository';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
  VerificationLevel,
} from '../domain/resource-enums';
import { Category } from '../../supplies/domain/category';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';

function snapshot(
  overrides: Partial<ResourceSnapshot> & { id: string },
): ResourceSnapshot {
  return {
    id: overrides.id,
    emergencyId: overrides.emergencyId ?? EM,
    type: ResourceType.Venue,
    stage: ResourceStage.Destination,
    name: 'Hospital Central',
    description: null,
    location: { address: 'Calle 1', latitude: 10.4, longitude: -66.9 },
    ownerUserId: 'owner-1',
    ownerOrganizationId: null,
    verificationLevel: VerificationLevel.Official,
    publicStatus: overrides.publicStatus ?? PublicStatus.Active,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    contact: null,
    schedule: null,
    manager: null,
    accepts: [],
    country: null,
    city: null,
    provenance: null,
    isFinalRecipient: true,
    recipientType: 'hospital',
    items: [],
    ...overrides,
  };
}

function repoWith(...resources: Resource[]): ResourceRepository {
  const store = new Map(resources.map((r) => [r.id.value, r]));
  return {
    findById: (id: ResourceId) => Promise.resolve(store.get(id.value) ?? null),
  } as unknown as ResourceRepository;
}

describe('GetPublicResource', () => {
  const ID = '33333333-3333-4333-8333-333333333333';

  it('returns the view for a visible resource in the emergency', async () => {
    const resource = Resource.fromSnapshot(snapshot({ id: ID }));
    const useCase = new GetPublicResource(repoWith(resource));

    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });

    expect(view).not.toBeNull();
    expect(view!.id).toBe(ID);
    expect(view!.isFinalRecipient).toBe(true);
    expect(view!.recipientType).toBe('hospital');
  });

  it('aggregates the declared inventory to distinct categories (no names/quantities)', async () => {
    const resource = Resource.fromSnapshot(
      snapshot({
        id: ID,
        items: [
          {
            name: 'Agua',
            quantity: 100,
            unit: 'litros',
            category: Category.Water,
          },
          // Same category as above → must be deduplicated.
          {
            name: 'Botellas',
            quantity: 50,
            unit: null,
            category: Category.Water,
          },
          {
            name: 'Mantas',
            quantity: 5,
            unit: null,
            category: Category.Shelter,
          },
        ],
      }),
    );
    const useCase = new GetPublicResource(repoWith(resource));

    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });

    // Privacy: only the distinct categories are exposed — never names/quantities.
    expect(view!.inventoryCategories).toEqual([
      Category.Water,
      Category.Shelter,
    ]);
    expect(JSON.stringify(view)).not.toContain('Botellas');
    expect(JSON.stringify(view)).not.toContain('100');
  });

  it('returns null when the resource does not exist', async () => {
    const useCase = new GetPublicResource(repoWith());
    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });
    expect(view).toBeNull();
  });

  it('returns null when the resource belongs to another emergency', async () => {
    const resource = Resource.fromSnapshot(
      snapshot({ id: ID, emergencyId: OTHER_EM }),
    );
    const useCase = new GetPublicResource(repoWith(resource));
    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });
    expect(view).toBeNull();
  });

  it('returns null when the resource is not publicly visible', async () => {
    const hidden = Resource.fromSnapshot(
      snapshot({ id: ID, publicStatus: PublicStatus.Hidden }),
    );
    const useCase = new GetPublicResource(repoWith(hidden));
    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });
    expect(view).toBeNull();
  });

  it('returns null when the resource is active but unverified — #94', async () => {
    // An ingested point can be Active yet Unverified; the public API must not
    // expose it as if it were validated.
    const unverified = Resource.fromSnapshot(
      snapshot({
        id: ID,
        publicStatus: PublicStatus.Active,
        verificationLevel: VerificationLevel.Unverified,
      }),
    );
    const useCase = new GetPublicResource(repoWith(unverified));
    const view = await useCase.execute({ emergencyId: EM, resourceId: ID });
    expect(view).toBeNull();
  });
});
