import { UpdateResourcePublicStatus } from './update-resource-public-status';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType, PublicStatus } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceNotFoundError } from './resource-not-found.error';
import { UnauthorizedStatusChangeError } from './unauthorized-status-change.error';
import {
  ResourceNotPublishedError,
  InvalidPublicStatusTransitionError,
} from '../domain/resource-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'owner-user-0000-0000-000000000000';
const COORD_ID = 'coord-user-0000-0000-000000000000';
const THIRD_ID = 'third-user-0000-0000-000000000000';
const MANAGER_ID = 'manager-user-0000-0000-000000000000';
const baseLocation = {
  address: 'Calle Test 1, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

const noAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

/** Coordinator reader that only COORD_ID is coordinator */
const coordOnlyMembership: ResourceMembershipReader = {
  isCoordinator: (userId, _emId) => Promise.resolve(userId === COORD_ID),
};

/** No one is coordinator */
const noMembership: ResourceMembershipReader = {
  isCoordinator: () => Promise.resolve(false),
};

async function makePublishedResource(
  repo: InMemoryResourceRepository,
  bus: FakeEventBus,
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: EM,
    type: ResourceType.CollectionPoint,
    name: 'Punto Test',
    location: baseLocation,
    ownerUserId: OWNER_ID,
  });
  await new VerifyResource(repo, bus, noAccreditationReader).execute({
    resourceId: id,
    coordinatorId: COORD_ID,
  });
  await new PublishResource(repo, bus).execute({ resourceId: id });
  bus.published = [];
  return id;
}

describe('UpdateResourcePublicStatus', () => {
  it('owner can mark their own resource as saturated', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await new UpdateResourcePublicStatus(repo, noMembership).execute({
      resourceId: id,
      targetStatus: PublicStatus.Saturated,
      requesterUserId: OWNER_ID,
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.publicStatus).toBe(PublicStatus.Saturated);
  });

  it('coordinator can change any resource status regardless of ownership', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await new UpdateResourcePublicStatus(repo, coordOnlyMembership).execute({
      resourceId: id,
      targetStatus: PublicStatus.Paused,
      requesterUserId: COORD_ID,
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.publicStatus).toBe(PublicStatus.Paused);
  });

  it('point manager (entity-scoped grant, not owner/coordinator) can change status (#316)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await new UpdateResourcePublicStatus(repo, noMembership).execute({
      resourceId: id,
      targetStatus: PublicStatus.Saturated,
      requesterUserId: MANAGER_ID,
      grants: [
        {
          roleId: 'point_manager',
          scope: { type: 'entity', entityType: 'resource', id },
          expiresAt: null,
        },
      ],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.publicStatus).toBe(PublicStatus.Saturated);
  });

  it('third-party user (not owner, not coordinator) → UnauthorizedStatusChangeError (→ 403)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await expect(
      new UpdateResourcePublicStatus(repo, noMembership).execute({
        resourceId: id,
        targetStatus: PublicStatus.Saturated,
        requesterUserId: THIRD_ID,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedStatusChangeError);
  });

  it('throws ResourceNotFoundError for unknown resourceId', async () => {
    const repo = new InMemoryResourceRepository();

    await expect(
      new UpdateResourcePublicStatus(repo, noMembership).execute({
        resourceId: '99999999-9999-4999-8999-999999999999',
        targetStatus: PublicStatus.Saturated,
        requesterUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('owner cannot change status of unpublished (Hidden) resource → ResourceNotPublishedError', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    // Register but do NOT publish
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      name: 'Hidden Warehouse',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });

    await expect(
      new UpdateResourcePublicStatus(repo, noMembership).execute({
        resourceId: id,
        targetStatus: PublicStatus.Saturated,
        requesterUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(ResourceNotPublishedError);
  });

  it('cannot transition to Hidden → InvalidPublicStatusTransitionError', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await expect(
      new UpdateResourcePublicStatus(repo, noMembership).execute({
        resourceId: id,
        targetStatus: PublicStatus.Hidden,
        requesterUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(InvalidPublicStatusTransitionError);
  });

  it('owner can reopen: Closed → Active', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makePublishedResource(repo, bus);

    await new UpdateResourcePublicStatus(repo, noMembership).execute({
      resourceId: id,
      targetStatus: PublicStatus.Closed,
      requesterUserId: OWNER_ID,
    });

    await new UpdateResourcePublicStatus(repo, noMembership).execute({
      resourceId: id,
      targetStatus: PublicStatus.Active,
      requesterUserId: OWNER_ID,
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.publicStatus).toBe(PublicStatus.Active);
  });
});
