import { GetDisputedResources } from './get-disputed-resources';
import { ReportResourceValidity } from './report-resource-validity';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { InMemoryResourceValidityReportRepository } from '../infrastructure/in-memory-resource-validity-report.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
} from '../domain/resource-enums';
import { ResourceId } from '../domain/resource-id';
import { ValidityReason } from '../domain/resource-validity-report';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};
const notAccredited: OrganizationAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

describe('GetDisputedResources', () => {
  let resources: InMemoryResourceRepository;
  let reports: InMemoryResourceValidityReportRepository;
  let bus: FakeEventBus;

  beforeEach(() => {
    resources = new InMemoryResourceRepository();
    reports = new InMemoryResourceValidityReportRepository();
    bus = new FakeEventBus();
  });

  async function seedPublished(): Promise<string> {
    const { id } = await new RegisterResource(
      resources,
      bus,
      activeReader,
    ).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Acopio Centro',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      ownerUserId: OWNER,
    });
    await new VerifyResource(resources, bus, notAccredited).execute({
      resourceId: id,
      coordinatorId: 'coord',
    });
    await new PublishResource(resources, bus).execute({ resourceId: id });
    return id;
  }

  it('lists disputed resources with a per-reason breakdown', async () => {
    const id = await seedPublished();
    const rep = new ReportResourceValidity(resources, reports, bus, 3);
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-1',
      reason: ValidityReason.Closed,
    });
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-2',
      reason: ValidityReason.Closed,
    });
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-3',
      reason: ValidityReason.Moved,
    });

    const out = await new GetDisputedResources(resources, reports).execute({
      emergencyId: EM,
    });

    expect(out).toHaveLength(1);
    expect(out[0].resource.id).toBe(id);
    expect(out[0].distinctReporters).toBe(3);
    expect(out[0].byReason).toEqual({ closed: 2, moved: 1 });
    expect(out[0].lastReportedAt).not.toBeNull();
  });

  it('returns an empty list when nothing is disputed', async () => {
    await seedPublished();
    const out = await new GetDisputedResources(resources, reports).execute({
      emergencyId: EM,
    });
    expect(out).toEqual([]);
  });

  it('excludes a disputed resource that is no longer visible (closed)', async () => {
    const id = await seedPublished();
    const rep = new ReportResourceValidity(resources, reports, bus, 3);
    for (const user of ['user-1', 'user-2', 'user-3']) {
      await rep.execute({
        resourceId: id,
        reporterUserId: user,
        reason: ValidityReason.Closed,
      });
    }

    // Coordinator closes it via the status semaphore (not the dispute flow),
    // so the disputed flag lingers — it must still drop out of the queue.
    const r = await resources.findById(ResourceId.fromString(id));
    r!.changePublicStatus(PublicStatus.Closed);
    await resources.save(r!);

    const out = await new GetDisputedResources(resources, reports).execute({
      emergencyId: EM,
    });
    expect(out).toEqual([]);
  });
});
