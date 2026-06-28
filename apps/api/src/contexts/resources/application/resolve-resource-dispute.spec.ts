import { ResolveResourceDispute } from './resolve-resource-dispute';
import { ReportResourceValidity } from './report-resource-validity';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { InMemoryResourceValidityReportRepository } from '../infrastructure/in-memory-resource-validity-report.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
  VerificationLevel,
} from '../domain/resource-enums';
import {
  ValidityReason,
  ValidityReportStatus,
} from '../domain/resource-validity-report';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';
import { ResourceNotDisputedError } from '../domain/resource-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};
const notAccredited: OrganizationAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

describe('ResolveResourceDispute', () => {
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

  async function seedDisputed(): Promise<string> {
    const id = await seedPublished();
    const rep = new ReportResourceValidity(resources, reports, bus, 3);
    for (const user of ['user-1', 'user-2', 'user-3']) {
      await rep.execute({
        resourceId: id,
        reporterUserId: user,
        reason: ValidityReason.Closed,
      });
    }
    return id;
  }

  const resolve = () => new ResolveResourceDispute(resources, reports, bus);

  it('confirm_closed closes the resource, accepts reports and clears the dispute', async () => {
    const id = await seedDisputed();
    const result = await resolve().execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'confirm_closed',
    });

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.publicStatus).toBe(PublicStatus.Closed);
    expect(r!.disputed).toBe(false);
    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBe(PublicStatus.Closed);
    const all = await reports.findByResource(id);
    expect(all.every((x) => x.status === ValidityReportStatus.Accepted)).toBe(
      true,
    );
  });

  it('mark_invalid rejects the resource and accepts reports', async () => {
    const id = await seedDisputed();
    const result = await resolve().execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'mark_invalid',
    });

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.verificationLevel).toBe(VerificationLevel.Rejected);
    expect(r!.disputed).toBe(false);
    expect(result.targetStatus).toBe(VerificationLevel.Rejected);
  });

  it('dismiss keeps the resource active and dismisses the reports', async () => {
    const id = await seedDisputed();
    const result = await resolve().execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'dismiss',
    });

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.publicStatus).toBe(PublicStatus.Active);
    expect(r!.disputed).toBe(false);
    expect(result.targetStatus).toBeNull();
    const all = await reports.findByResource(id);
    expect(all.every((x) => x.status === ValidityReportStatus.Dismissed)).toBe(
      true,
    );
  });

  it('throws when the resource is not disputed', async () => {
    const id = await seedPublished();
    await expect(
      resolve().execute({
        resourceId: id,
        coordinatorId: 'coord-1',
        resolution: 'dismiss',
      }),
    ).rejects.toThrow(ResourceNotDisputedError);
  });

  it('a second resolve throws (the dispute is already cleared)', async () => {
    const id = await seedDisputed();
    const uc = resolve();
    await uc.execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'dismiss',
    });
    await expect(
      uc.execute({
        resourceId: id,
        coordinatorId: 'coord-1',
        resolution: 'dismiss',
      }),
    ).rejects.toThrow(ResourceNotDisputedError);
  });

  it('dismiss records only the disputed→false change in the audit diff', async () => {
    const id = await seedDisputed();
    const result = await resolve().execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'dismiss',
    });

    const disputedChange = result.changes.find((c) => c.field === 'disputed');
    expect(disputedChange).toEqual({
      field: 'disputed',
      before: true,
      after: false,
    });
    // status/level unchanged on a dismiss, so they are not in the diff
    expect(result.changes.map((c) => c.field)).toEqual(['disputed']);
  });

  it('can be disputed again after a previous dispute was dismissed', async () => {
    const id = await seedDisputed();
    await resolve().execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'dismiss',
    });

    // A re-report by an original reporter opens a fresh report (their old one
    // is now Dismissed, not Open); a new round of 3 distinct users re-flags it.
    const rep = new ReportResourceValidity(resources, reports, bus, 3);
    for (const user of ['user-1', 'user-2', 'user-3']) {
      await rep.execute({
        resourceId: id,
        reporterUserId: user,
        reason: ValidityReason.Closed,
      });
    }

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.disputed).toBe(true);
    expect(await reports.countOpenByResource(id)).toBe(3);
  });
});
