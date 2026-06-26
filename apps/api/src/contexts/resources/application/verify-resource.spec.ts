import { VerifyResource } from './verify-resource';
import { RegisterResource } from './register-resource';
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

const EM = '11111111-1111-4111-8111-111111111111';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const baseLocation = {
  address: 'Av. Diagonal 123, Barcelona',
  latitude: 41.3851,
  longitude: 2.1734,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

/** Accreditation reader stub: accredited for org ORG + any emergency */
const accreditedReader: OrganizationAccreditationReader = {
  isAccredited: (orgId, _emId) => Promise.resolve(orgId === ORG),
};

/** Accreditation reader stub: never accredited */
const notAccreditedReader: OrganizationAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

describe('VerifyResource — Official derivation', () => {
  it('yields Official when resource belongs to an accredited org', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén',
      location: baseLocation,
      ownerUserId: 'user-1',
      ownerOrganizationId: ORG,
    });
    bus.published = [];

    await new VerifyResource(repo, bus, accreditedReader).execute({
      resourceId: id,
      coordinatorId: 'c1',
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.verificationLevel).toBe(VerificationLevel.Official);
    expect(bus.published.map((e) => e.eventName)).toEqual([
      'resource.verified',
    ]);
  });

  it('yields Verified when resource belongs to an org that is NOT accredited', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén 2',
      location: baseLocation,
      ownerUserId: 'user-1',
      ownerOrganizationId: 'other-org',
    });
    bus.published = [];

    await new VerifyResource(repo, bus, notAccreditedReader).execute({
      resourceId: id,
      coordinatorId: 'c1',
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.verificationLevel).toBe(VerificationLevel.Verified);
  });

  it('yields Verified when resource has no owner organization (personal)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Venue,
      stage: ResourceStage.Destination,
      name: 'Local personal',
      location: baseLocation,
      ownerUserId: 'user-2',
    });
    bus.published = [];

    await new VerifyResource(repo, bus, accreditedReader).execute({
      resourceId: id,
      coordinatorId: 'c1',
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.verificationLevel).toBe(VerificationLevel.Verified);
  });

  it('throws ResourceNotFoundError for an unknown id', async () => {
    const repo = new InMemoryResourceRepository();
    await expect(
      new VerifyResource(repo, new FakeEventBus(), notAccreditedReader).execute(
        {
          resourceId: '99999999-9999-4999-8999-999999999999',
          coordinatorId: 'c1',
        },
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
