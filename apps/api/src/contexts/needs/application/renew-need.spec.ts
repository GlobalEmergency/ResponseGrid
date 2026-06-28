import { RenewNeed, GetExpiredNeeds } from './renew-need';
import { CreateNeed } from './create-need';
import { ValidateNeed } from './validate-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Location } from '../../../shared/domain/location';
import { SupplyLine } from '../../supplies/domain/supply-line';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

function makeLocation() {
  return Location.create({
    address: 'Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  });
}

function makeExpiredNeed(): Need {
  const need = Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title: 'Expired need',
    description: null,
    location: makeLocation(),
    priority: Priority.Urgent,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    items: [
      SupplyLine.create({
        name: 'Kits',
        quantity: 5,
        unit: null,
        category: Category.Medical,
      }),
    ],
  });
  need.validate();
  // Manually back-date expiresAt to simulate an expired need
  const snap = need.toSnapshot();
  const pastExpiry = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
  const pastVerified = new Date(Date.now() - 1000 * 60 * 60 * 50); // 50 hours ago
  return Need.fromSnapshot({
    ...snap,
    expiresAt: pastExpiry,
    lastVerifiedAt: pastVerified,
  });
}

describe('RenewNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let renewNeed: RenewNeed;
  let createNeed: CreateNeed;
  let validateNeed: ValidateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    renewNeed = new RenewNeed(repo);
    createNeed = new CreateNeed(repo, bus, activeReader);
    validateNeed = new ValidateNeed(repo, bus);
  });

  it('throws NeedNotFoundError for unknown needId', async () => {
    await expect(
      renewNeed.execute({ needId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    ).rejects.toThrow(NeedNotFoundError);
  });

  it('renew() resets expiresAt to future and updates lastVerifiedAt', async () => {
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Water',
      description: null,
      location: { address: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
      priority: Priority.High,
      items: [
        {
          name: 'Bottles',
          quantity: 10,
          unit: null,
          category: Category.Water,
        },
      ],
    });
    await validateNeed.execute({ needId: id });

    const before = new Date();
    const result = await renewNeed.execute({ needId: id });
    const after = new Date();

    expect(result.expiresAt).not.toBeNull();
    const expiresAt = new Date(result.expiresAt!);
    // Should be ~48h in the future
    expect(expiresAt.getTime()).toBeGreaterThan(
      before.getTime() + 47 * 60 * 60 * 1000,
    );
    expect(expiresAt.getTime()).toBeLessThan(
      after.getTime() + 49 * 60 * 60 * 1000,
    );

    expect(result.lastVerifiedAt).not.toBeNull();
    const lastVerified = new Date(result.lastVerifiedAt!);
    expect(lastVerified.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastVerified.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('renew() revives an expired need so it appears in public list again', async () => {
    const getExpiredNeeds = new GetExpiredNeeds(repo);

    const expired = makeExpiredNeed();
    await repo.save(expired);

    // Expired need should appear in expired list
    const expiredBefore = await getExpiredNeeds.execute({ emergencyId: EM });
    expect(expiredBefore.map((n) => n.id)).toContain(expired.id.value);

    // Not in validated (public) list
    const validatedBefore = await repo.findValidatedByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(validatedBefore.map((n) => n.id.value)).not.toContain(
      expired.id.value,
    );

    // Renew it
    await renewNeed.execute({ needId: expired.id.value });

    // Now it should appear in validated list
    const validatedAfter = await repo.findValidatedByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(validatedAfter.map((n) => n.id.value)).toContain(expired.id.value);

    // And no longer in expired list
    const expiredAfter = await getExpiredNeeds.execute({ emergencyId: EM });
    expect(expiredAfter.map((n) => n.id)).not.toContain(expired.id.value);
  });
});

describe('GetExpiredNeeds', () => {
  let repo: InMemoryNeedRepository;
  let getExpiredNeeds: GetExpiredNeeds;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    getExpiredNeeds = new GetExpiredNeeds(repo);
  });

  it('returns only expired needs', async () => {
    const expired = makeExpiredNeed();
    await repo.save(expired);

    // Create a fresh validated need (not expired)
    const fresh = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Fresh need',
      description: null,
      location: makeLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Food',
          quantity: 10,
          unit: null,
          category: Category.Food,
        }),
      ],
    });
    fresh.validate();
    await repo.save(fresh);

    const result = await getExpiredNeeds.execute({ emergencyId: EM });
    expect(result.map((n) => n.id)).toContain(expired.id.value);
    expect(result.map((n) => n.id)).not.toContain(fresh.id.value);
  });

  it('public list excludes expired but not null-expiresAt (legacy)', async () => {
    const expired = makeExpiredNeed();
    await repo.save(expired);

    // Legacy need with null expiresAt
    const legacy = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Legacy need',
      description: null,
      location: makeLocation(),
      priority: Priority.Low,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Shelter',
          quantity: 1,
          unit: null,
          category: Category.Shelter,
        }),
      ],
    });
    // Manually validate without setting expiresAt (simulate old row)
    const snap = legacy.toSnapshot();
    legacy.validate();
    // Overwrite back to null expiresAt to simulate legacy row
    const legacySnap = {
      ...legacy.toSnapshot(),
      expiresAt: null,
      lastVerifiedAt: null,
    };
    const legacyNeed = Need.fromSnapshot(legacySnap);
    await repo.save(legacyNeed);

    const validated = await repo.findValidatedByEmergency(
      EmergencyId.fromString(EM),
    );
    const ids = validated.map((n) => n.id.value);
    expect(ids).not.toContain(expired.id.value); // expired → excluded
    expect(ids).toContain(legacyNeed.id.value); // null expiresAt → included

    // suppress unused warning
    expect(snap).toBeDefined();
  });
});
