import { GetEmergencyMetrics } from './get-emergency-metrics';
import { InMemoryNeedRepository } from '../../needs/infrastructure/in-memory-need.repository';
import { InMemoryResourceRepository } from '../../resources/infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../../needs/infrastructure/fake-event-bus';
import { CreateNeed } from '../../needs/application/create-need';
import { ValidateNeed } from '../../needs/application/validate-need';
import { Need } from '../../needs/domain/need';
import { NeedId } from '../../needs/domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedCategory, Priority } from '../../needs/domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { NeedItem } from '../../needs/domain/need-item';
import { Resource } from '../../resources/domain/resource';
import { ResourceId } from '../../resources/domain/resource-id';
import { ResourceType, ResourceStage, VerificationLevel } from '../../resources/domain/resource-enums';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeNeedLocation() {
  return Location.create({ address: 'Caracas', latitude: 10.48, longitude: -66.9 });
}

function makeNeedItems() {
  return [NeedItem.create({ name: 'Water', quantity: 10, unit: null, category: NeedCategory.Water })];
}

function seedNeed(repo: InMemoryNeedRepository, title: string): Need {
  const need = Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title,
    description: null,
    location: makeNeedLocation(),
    priority: Priority.High,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    items: makeNeedItems(),
  });
  return need;
}

function makeResourceLocation() {
  return Location.create({ address: 'Sevilla', latitude: 37.38, longitude: -5.98 });
}

function seedResource(repo: InMemoryResourceRepository, name: string): Resource {
  return Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString(EM),
    type: ResourceType.CollectionPoint,
    stage: ResourceStage.Origin,
    name,
    location: makeResourceLocation(),
    ownerUserId: USER_ID,
  });
}

describe('GetEmergencyMetrics', () => {
  let needRepo: InMemoryNeedRepository;
  let resourceRepo: InMemoryResourceRepository;
  let bus: FakeEventBus;
  let createNeed: CreateNeed;
  let validateNeed: ValidateNeed;
  let useCase: GetEmergencyMetrics;

  beforeEach(() => {
    needRepo = new InMemoryNeedRepository();
    resourceRepo = new InMemoryResourceRepository();
    bus = new FakeEventBus();
    createNeed = new CreateNeed(needRepo, bus);
    validateNeed = new ValidateNeed(needRepo, bus);
    useCase = new GetEmergencyMetrics(needRepo, resourceRepo);
  });

  it('returns all zeros when emergency has no needs or resources', async () => {
    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(0);
    expect(result.needs.open).toBe(0);
    expect(result.needs.closed).toBe(0);
    expect(result.resources.total).toBe(0);
    expect(result.resources.active).toBe(0);
    expect(result.resources.pending).toBe(0);
  });

  it('counts pending needs as open and in total', async () => {
    const n1 = seedNeed(needRepo, 'N1');
    const n2 = seedNeed(needRepo, 'N2');
    await needRepo.save(n1);
    await needRepo.save(n2);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(2);
    expect(result.needs.open).toBe(2); // pending counts as open
    expect(result.needs.closed).toBe(0);
  });

  it('counts validated needs as open', async () => {
    const n1 = seedNeed(needRepo, 'N1');
    await needRepo.save(n1);
    n1.validate();
    await needRepo.save(n1);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(1);
    expect(result.needs.open).toBe(1); // validated counts as open
    expect(result.needs.closed).toBe(0);
  });

  it('counts fulfilled needs as closed, not open', async () => {
    const n1 = seedNeed(needRepo, 'N1');
    await needRepo.save(n1);
    n1.validate();
    n1.close();
    await needRepo.save(n1);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(1);
    expect(result.needs.open).toBe(0);
    expect(result.needs.closed).toBe(1);
  });

  it('counts rejected needs in total but not in open or closed', async () => {
    const n1 = seedNeed(needRepo, 'N1');
    await needRepo.save(n1);
    n1.reject();
    await needRepo.save(n1);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(1);
    expect(result.needs.open).toBe(0);
    expect(result.needs.closed).toBe(0);
  });

  it('combines mixed need statuses correctly', async () => {
    // 2 pending, 1 validated, 1 rejected, 1 fulfilled
    const pending1 = seedNeed(needRepo, 'P1');
    const pending2 = seedNeed(needRepo, 'P2');
    const validated = seedNeed(needRepo, 'V1');
    const rejected = seedNeed(needRepo, 'R1');
    const fulfilled = seedNeed(needRepo, 'F1');

    await needRepo.save(pending1);
    await needRepo.save(pending2);

    validated.validate();
    await needRepo.save(validated);

    rejected.reject();
    await needRepo.save(rejected);

    fulfilled.validate();
    fulfilled.close();
    await needRepo.save(fulfilled);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(5);
    expect(result.needs.open).toBe(3);  // 2 pending + 1 validated
    expect(result.needs.closed).toBe(1); // 1 fulfilled
    // rejected: in total, not in open/closed
  });

  it('counts hidden resources as pending, active as active', async () => {
    const hidden = seedResource(resourceRepo, 'Hidden resource');
    await resourceRepo.save(hidden);

    const active = seedResource(resourceRepo, 'Active resource');
    active.verify(VerificationLevel.Verified, 'coord-1');
    active.publish();
    await resourceRepo.save(active);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.resources.total).toBe(2);
    expect(result.resources.active).toBe(1);
    expect(result.resources.pending).toBe(1);
  });

  it('ignores needs and resources from other emergencies', async () => {
    const OTHER_EM = '22222222-2222-4222-8222-222222222222';

    const myNeed = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'My need',
      description: null,
      location: makeNeedLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: makeNeedItems(),
    });
    await needRepo.save(myNeed);

    const otherNeed = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(OTHER_EM),
      title: 'Other need',
      description: null,
      location: makeNeedLocation(),
      priority: Priority.Low,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: makeNeedItems(),
    });
    await needRepo.save(otherNeed);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result.needs.total).toBe(1);
  });
});
