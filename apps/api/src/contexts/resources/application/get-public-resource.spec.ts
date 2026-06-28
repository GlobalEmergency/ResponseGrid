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
});
