import { AutoHideDisputedResource } from './auto-hide-disputed-resource';
import { ResolveResourceDispute } from './resolve-resource-dispute';
import { ReportResourceValidity } from './report-resource-validity';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { InMemoryResourceValidityReportRepository } from '../infrastructure/in-memory-resource-validity-report.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { PublicStatus, ResourceType } from '../domain/resource-enums';
import { ValidityReason } from '../domain/resource-validity-report';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { EmergencyAutoHideOnDisputeReader } from '../domain/ports/emergency-auto-hide-on-dispute-reader';
import { AuditTrail, SystemAuditEntry } from '../domain/ports/audit-trail';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

function policyReader(enabled: boolean): EmergencyAutoHideOnDisputeReader {
  return { getAutoHideOnDispute: () => Promise.resolve(enabled) };
}

class RecordingAuditTrail implements AuditTrail {
  readonly recorded: SystemAuditEntry[] = [];
  recordSystemAction(entry: SystemAuditEntry): Promise<void> {
    this.recorded.push(entry);
    return Promise.resolve();
  }
}

describe('AutoHideDisputedResource (#171)', () => {
  let resources: InMemoryResourceRepository;
  let reports: InMemoryResourceValidityReportRepository;
  let bus: FakeEventBus;

  beforeEach(() => {
    resources = new InMemoryResourceRepository();
    reports = new InMemoryResourceValidityReportRepository();
    bus = new FakeEventBus();
  });

  async function seedDisputed(): Promise<string> {
    const { id } = await new RegisterResource(
      resources,
      bus,
      activeReader,
    ).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Acopio Centro',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      ownerUserId: OWNER,
    });
    await new VerifyResource(resources, bus, {
      isAccredited: () => Promise.resolve(false),
    }).execute({ resourceId: id, coordinatorId: 'coord' });
    await new PublishResource(resources, bus).execute({ resourceId: id });

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

  it('does nothing when the policy is off (default MVP behavior unchanged)', async () => {
    const id = await seedDisputed();
    const audit = new RecordingAuditTrail();
    const resolve = new ResolveResourceDispute(resources, reports, bus);
    const useCase = new AutoHideDisputedResource(
      policyReader(false),
      resolve,
      audit,
    );

    await useCase.execute({ resourceId: id, emergencyId: EM });

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.disputed).toBe(true);
    expect(r!.publicStatus).toBe(PublicStatus.Active);
    expect(audit.recorded).toEqual([]);
  });

  it('closes the resource like a human confirm_closed when the policy is on', async () => {
    const id = await seedDisputed();
    const audit = new RecordingAuditTrail();
    const resolve = new ResolveResourceDispute(resources, reports, bus);
    const useCase = new AutoHideDisputedResource(
      policyReader(true),
      resolve,
      audit,
    );

    await useCase.execute({ resourceId: id, emergencyId: EM });

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.publicStatus).toBe(PublicStatus.Closed);
    expect(r!.disputed).toBe(false);
  });

  it('records a system-attributed audit entry when it auto-hides', async () => {
    const id = await seedDisputed();
    const audit = new RecordingAuditTrail();
    const resolve = new ResolveResourceDispute(resources, reports, bus);
    const useCase = new AutoHideDisputedResource(
      policyReader(true),
      resolve,
      audit,
    );

    await useCase.execute({ resourceId: id, emergencyId: EM });

    expect(audit.recorded).toHaveLength(1);
    const entry = audit.recorded[0];
    expect(entry.entityType).toBe('resource');
    expect(entry.entityId).toBe(id);
    expect(entry.emergencyId).toBe(EM);
    expect(entry.targetStatus).toBe(PublicStatus.Closed);
    expect(entry.changes.some((c) => c.field === 'publicStatus')).toBe(true);
  });

  it('is a no-op when a human already resolved the dispute (idempotent)', async () => {
    const id = await seedDisputed();
    const audit = new RecordingAuditTrail();
    const resolve = new ResolveResourceDispute(resources, reports, bus);
    // Human resolves first (dismiss) — the resource is no longer disputed.
    await resolve.execute({
      resourceId: id,
      coordinatorId: 'coord-1',
      resolution: 'dismiss',
    });

    const useCase = new AutoHideDisputedResource(
      policyReader(true),
      resolve,
      audit,
    );
    await expect(
      useCase.execute({ resourceId: id, emergencyId: EM }),
    ).resolves.toBeUndefined();

    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.publicStatus).toBe(PublicStatus.Active);
    expect(audit.recorded).toEqual([]);
  });
});
