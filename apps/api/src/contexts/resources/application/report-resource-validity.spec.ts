import { ReportResourceValidity } from './report-resource-validity';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { InMemoryResourceValidityReportRepository } from '../infrastructure/in-memory-resource-validity-report.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType, ResourceStage } from '../domain/resource-enums';
import { ValidityReason } from '../domain/resource-validity-report';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';
import {
  OwnerCannotReportValidityError,
  ResourceNotReportableError,
} from '../domain/resource-errors';
import { ResourceNotFoundError } from './resource-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};
const notAccredited: OrganizationAccreditationReader = {
  isAccredited: () => Promise.resolve(false),
};

describe('ReportResourceValidity', () => {
  let resources: InMemoryResourceRepository;
  let reports: InMemoryResourceValidityReportRepository;
  let bus: FakeEventBus;

  beforeEach(() => {
    resources = new InMemoryResourceRepository();
    reports = new InMemoryResourceValidityReportRepository();
    bus = new FakeEventBus();
  });

  async function seedPublished(name = 'Acopio Centro'): Promise<string> {
    const { id } = await new RegisterResource(
      resources,
      bus,
      activeReader,
    ).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name,
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

  const useCase = (
    threshold?: number,
    emergencyThresholds?: {
      getThreshold: (id: string) => Promise<number | null>;
    },
  ): ReportResourceValidity =>
    new ReportResourceValidity(
      resources,
      reports,
      bus,
      threshold,
      emergencyThresholds,
    );

  const cmd = (resourceId: string, reporterUserId: string) => ({
    resourceId,
    reporterUserId,
    reason: ValidityReason.Closed,
  });

  it('records a report without disputing on the first vote', async () => {
    const id = await seedPublished();
    const res = await useCase(3).execute(cmd(id, 'user-1'));
    expect(res.disputed).toBe(false);
    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.disputed).toBe(false);
  });

  it('flags the resource disputed once N distinct users report it', async () => {
    const id = await seedPublished();
    const rep = useCase(3);
    await rep.execute(cmd(id, 'user-1'));
    await rep.execute(cmd(id, 'user-2'));
    const res = await rep.execute(cmd(id, 'user-3'));
    expect(res.disputed).toBe(true);
    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.disputed).toBe(true);
    expect(bus.published.map((e) => e.eventName)).toContain(
      'resource.disputed',
    );
  });

  it('dedups the same user: re-reporting updates their open report', async () => {
    const id = await seedPublished();
    const rep = useCase(3);
    await rep.execute(cmd(id, 'user-1'));
    await rep.execute({ ...cmd(id, 'user-1'), reason: ValidityReason.Moved });
    await rep.execute(cmd(id, 'user-2'));
    const r = await resources.findById(ResourceId.fromString(id));
    expect(r!.disputed).toBe(false); // only 2 distinct reporters
    expect(await reports.countOpenByResource(id)).toBe(2);
  });

  it('re-reporting with only a new reason keeps the previous note and photos', async () => {
    const id = await seedPublished();
    const rep = useCase(3);
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-1',
      reason: ValidityReason.Closed,
      note: 'Lleva semanas cerrado',
      photoUrls: ['https://img/1.jpg'],
    });
    // Re-report changing ONLY the reason — note/photos omitted must not be wiped.
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-1',
      reason: ValidityReason.Moved,
    });

    const open = await reports.findOpenByResource(id);
    expect(open).toHaveLength(1);
    expect(open[0].reason).toBe(ValidityReason.Moved);
    expect(open[0].note).toBe('Lleva semanas cerrado');
    expect(open[0].photoUrls).toEqual(['https://img/1.jpg']);
  });

  it('re-reporting can still clear the note by passing it explicitly as null', async () => {
    const id = await seedPublished();
    const rep = useCase(3);
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-1',
      reason: ValidityReason.Closed,
      note: 'Nota inicial',
    });
    await rep.execute({
      resourceId: id,
      reporterUserId: 'user-1',
      reason: ValidityReason.Closed,
      note: null,
    });

    const open = await reports.findOpenByResource(id);
    expect(open[0].note).toBeNull();
  });

  it('blocks the owner from reporting their own resource', async () => {
    const id = await seedPublished();
    await expect(useCase().execute(cmd(id, OWNER))).rejects.toThrow(
      OwnerCannotReportValidityError,
    );
  });

  it('rejects reports for an unknown resource', async () => {
    await expect(
      useCase().execute(cmd('22222222-2222-4222-8222-222222222222', 'user-1')),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it('rejects a report for a non-visible (unpublished) resource', async () => {
    const { id } = await new RegisterResource(
      resources,
      bus,
      activeReader,
    ).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Oculto',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      ownerUserId: OWNER,
    });
    await expect(useCase().execute(cmd(id, 'user-1'))).rejects.toThrow(
      ResourceNotReportableError,
    );
  });

  it('usa el umbral por emergencia cuando está configurado', async () => {
    const id = await seedPublished();
    // Umbral de 2 en vez del global de 3
    const thresholdReader = {
      getThreshold: () => Promise.resolve(2 as number | null),
    };
    const rep = useCase(3, thresholdReader);
    await rep.execute(cmd(id, 'user-1'));
    const res = await rep.execute(cmd(id, 'user-2'));
    expect(res.disputed).toBe(true);
  });

  it('usa el umbral global cuando el umbral por emergencia es null', async () => {
    const id = await seedPublished();
    const thresholdReader = {
      getThreshold: () => Promise.resolve(null as number | null),
    };
    const rep = useCase(3, thresholdReader);
    await rep.execute(cmd(id, 'user-1'));
    await rep.execute(cmd(id, 'user-2'));
    const res = await rep.execute(cmd(id, 'user-3'));
    expect(res.disputed).toBe(true);
  });
});
