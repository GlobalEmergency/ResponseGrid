import { SuggestVolunteersForNeed } from './suggest-volunteers-for-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { CreateNeed } from './create-need';
import { Category, Priority, PersonnelSkill } from '../domain/need-enums';
import {
  VolunteerMatcherPort,
  VolunteerMatchResult,
} from '../domain/ports/volunteer-matcher.port';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedNotFoundError } from './need-not-found.error';

const EM = '22222222-2222-4222-8222-222222222222';
const EM2 = '33333333-3333-4333-8333-333333333333';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const defaultLocation = {
  address: '123 Aid Street, Caracas',
  latitude: 10.4806,
  longitude: -66.9036,
};

const defaultItems = [
  {
    name: 'Medical personnel',
    quantity: 2,
    unit: null,
    category: Category.MedicalPersonnel,
  },
];

class FakeNeedEmergencyStatusReader implements NeedEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

const activeReader = new FakeNeedEmergencyStatusReader('active');

const VOLUNTEER_A: VolunteerMatchResult = {
  volunteerId: 'vol-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId: 'user-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Ana García',
  skills: ['medical', 'general'],
  hasVehicle: true,
  availability: 'immediate',
};

const VOLUNTEER_B: VolunteerMatchResult = {
  volunteerId: 'vol-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  userId: 'user-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Luis Martínez',
  skills: ['medical'],
  hasVehicle: false,
  availability: 'this_week',
};

/** Mock matcher that returns a fixed list for a given emergencyId + skill. */
class FakeVolunteerMatcher implements VolunteerMatcherPort {
  constructor(private readonly results: Map<string, VolunteerMatchResult[]>) {}

  findAvailableBySkill(
    emergencyId: string,
    _skill: string,
    limit?: number,
  ): Promise<VolunteerMatchResult[]> {
    const all = this.results.get(emergencyId) ?? [];
    return Promise.resolve(limit !== undefined ? all.slice(0, limit) : all);
  }
}

describe('SuggestVolunteersForNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let createNeed: CreateNeed;
  let matcher: FakeVolunteerMatcher;
  let useCase: SuggestVolunteersForNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    createNeed = new CreateNeed(repo, bus, activeReader);
    const results = new Map<string, VolunteerMatchResult[]>();
    results.set(EM, [VOLUNTEER_A, VOLUNTEER_B]);
    results.set(EM2, []); // different emergency — no results
    matcher = new FakeVolunteerMatcher(results);
    useCase = new SuggestVolunteersForNeed(repo, matcher);
  });

  it('throws NeedNotFoundError for unknown needId', async () => {
    await expect(
      useCase.execute({ needId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow(NeedNotFoundError);
  });

  it('returns available volunteers matching the requiredSkill', async () => {
    const { id: needId } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Need medical staff',
      description: null,
      location: defaultLocation,
      priority: Priority.High,
      items: defaultItems,
      requiredSkill: PersonnelSkill.Medical,
    });

    const suggestions = await useCase.execute({ needId });
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].volunteerId).toBe(VOLUNTEER_A.volunteerId);
    expect(suggestions[1].volunteerId).toBe(VOLUNTEER_B.volunteerId);
  });

  it('respects the limit parameter', async () => {
    const { id: needId } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Need medical staff',
      description: null,
      location: defaultLocation,
      priority: Priority.High,
      items: defaultItems,
      requiredSkill: PersonnelSkill.Medical,
    });

    const suggestions = await useCase.execute({ needId, limit: 1 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].volunteerId).toBe(VOLUNTEER_A.volunteerId);
  });

  it('falls back to "medical" skill when requiredSkill is null', async () => {
    // No requiredSkill set — should still query with "medical" default
    let capturedSkill = '';
    const spyMatcher: VolunteerMatcherPort = {
      findAvailableBySkill: (emergencyId, skill) => {
        capturedSkill = skill;
        return matcher.findAvailableBySkill(emergencyId, skill);
      },
    };
    const uc = new SuggestVolunteersForNeed(repo, spyMatcher);

    const { id: needId } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Need medical staff',
      description: null,
      location: defaultLocation,
      priority: Priority.High,
      items: defaultItems,
      requiredSkill: null, // no skill set
    });

    await uc.execute({ needId });
    expect(capturedSkill).toBe('medical');
  });

  it('returns empty array when no volunteers match', async () => {
    const { id: needId } = await createNeed.execute({
      emergencyId: EM2, // emergency with no volunteers in matcher
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Need staff in EM2',
      description: null,
      location: defaultLocation,
      priority: Priority.Medium,
      items: defaultItems,
      requiredSkill: PersonnelSkill.Medical,
    });

    const suggestions = await useCase.execute({ needId });
    expect(suggestions).toHaveLength(0);
  });
});
