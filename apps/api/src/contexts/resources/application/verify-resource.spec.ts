import { VerifyResource } from './verify-resource';
import { RegisterResource } from './register-resource';
import { ResourceNotFoundError } from './resource-not-found.error';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType, VerificationLevel } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';
import {
  NotificationsPort,
  CreateNotificationParams,
} from '../../notifications/domain/ports/notifications.port';

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

class FakeNotificationsPort implements NotificationsPort {
  calls: CreateNotificationParams[] = [];
  create(params: CreateNotificationParams): Promise<void> {
    this.calls.push(params);
    return Promise.resolve();
  }
}

describe('VerifyResource — Official derivation', () => {
  it('yields Official when resource belongs to an accredited org', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
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

  it('calls NotificationsPort with owner userId after verification', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const notifications = new FakeNotificationsPort();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Venue,
      name: 'Local',
      location: baseLocation,
      ownerUserId: 'owner-user',
    });
    bus.published = [];

    await new VerifyResource(
      repo,
      bus,
      accreditedReader,
      notifications,
    ).execute({
      resourceId: id,
      coordinatorId: 'c1',
    });

    expect(notifications.calls).toHaveLength(1);
    expect(notifications.calls[0].userId).toBe('owner-user');
    expect(notifications.calls[0].emergencyId).toBe(EM);
  });

  it('does not throw when NotificationsPort is not provided', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Venue,
      name: 'Local',
      location: baseLocation,
      ownerUserId: 'owner-user',
    });

    await expect(
      new VerifyResource(repo, bus, accreditedReader).execute({
        resourceId: id,
        coordinatorId: 'c1',
      }),
    ).resolves.not.toThrow();
  });
});
