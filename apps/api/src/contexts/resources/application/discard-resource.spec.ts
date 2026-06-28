import { DiscardResource } from './discard-resource';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { ResourceNotFoundError } from './resource-not-found.error';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
} from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';
import { ResourceNotPendingError } from '../domain/resource-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};
const notAccredited: OrganizationAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

describe('DiscardResource', () => {
  let repo: InMemoryResourceRepository;
  let bus: FakeEventBus;
  let discardResource: DiscardResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    bus = new FakeEventBus();
    discardResource = new DiscardResource(repo);
  });

  async function seed(): Promise<string> {
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Acopio Centro',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      ownerUserId: OWNER,
    });
    return id;
  }

  it('marks the resource rejected and reports the change', async () => {
    const id = await seed();

    const result = await discardResource.execute({ resourceId: id });

    const resource = await repo.findById(ResourceId.fromString(id));
    expect(resource!.verificationLevel).toBe(VerificationLevel.Rejected);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBe(VerificationLevel.Rejected);
    expect(result.changes).toEqual([
      {
        field: 'verificationLevel',
        before: VerificationLevel.Unverified,
        after: VerificationLevel.Rejected,
      },
    ]);
  });

  it('throws ResourceNotFoundError for an unknown id', async () => {
    await expect(
      discardResource.execute({ resourceId: OWNER }),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it('cannot discard a resource that is already verified', async () => {
    const id = await seed();
    await new VerifyResource(repo, bus, notAccredited).execute({
      resourceId: id,
      coordinatorId: OWNER,
    });

    await expect(discardResource.execute({ resourceId: id })).rejects.toThrow(
      ResourceNotPendingError,
    );
  });
});
