import { Need, NeedItemsRequiredError } from './need';
import { NeedId } from './need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, NeedCategory, NeedStatus } from './need-enums';
import { NeedNotPendingError } from './need-errors';
import { Location } from '../../../shared/domain/location';
import { NeedItem } from './need-item';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeLocation(): Location {
  return Location.create({
    address: '123 Main St, Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  });
}

function makeItems(): NeedItem[] {
  return [
    NeedItem.create({ name: 'Water bottles', quantity: 100, unit: 'units', category: NeedCategory.Water }),
  ];
}

function makeNeed(): Need {
  return Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title: 'Water for refugees',
    description: 'Urgent water supply needed',
    location: makeLocation(),
    priority: Priority.Urgent,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    items: makeItems(),
  });
}

describe('Need aggregate', () => {
  it('creates with Pending status and emits need.created event', () => {
    const need = makeNeed();
    expect(need.status).toBe(NeedStatus.Pending);
    const events = need.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('need.created');
  });

  it('create() sets requesterUserId and null managingOrganizationId', () => {
    const need = makeNeed();
    expect(need.requesterUserId).toBe(USER_ID);
    expect(need.managingOrganizationId).toBeNull();
    expect(need.requesterOrganizationId).toBeNull();
  });

  it('create() stores items on the aggregate', () => {
    const need = makeNeed();
    expect(need.items).toHaveLength(1);
    expect(need.items[0].name).toBe('Water bottles');
    expect(need.items[0].quantity).toBe(100);
    expect(need.items[0].category).toBe(NeedCategory.Water);
  });

  it('create() throws NeedItemsRequiredError when items is empty', () => {
    expect(() =>
      Need.create({
        id: NeedId.create(),
        emergencyId: EmergencyId.fromString(EM),
        title: 'No items',
        description: null,
        location: makeLocation(),
        priority: Priority.Low,
        requesterUserId: USER_ID,
        requesterOrganizationId: null,
        items: [],
      }),
    ).toThrow(NeedItemsRequiredError);
  });

  it('create() with multiple items works', () => {
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Multi-item need',
      description: null,
      location: makeLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      items: [
        NeedItem.create({ name: 'Food', quantity: 50, unit: 'boxes', category: NeedCategory.Food }),
        NeedItem.create({ name: 'Blankets', quantity: 20, unit: null, category: NeedCategory.Shelter }),
      ],
    });
    expect(need.items).toHaveLength(2);
    expect(need.requesterOrganizationId).toBe('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('validate() transitions to Validated and emits need.validated event', () => {
    const need = makeNeed();
    need.pullDomainEvents();
    need.validate();
    expect(need.status).toBe(NeedStatus.Validated);
    const events = need.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('need.validated');
  });

  it('reject() transitions to Rejected and emits need.rejected event', () => {
    const need = makeNeed();
    need.pullDomainEvents();
    need.reject();
    expect(need.status).toBe(NeedStatus.Rejected);
    const events = need.pullDomainEvents();
    expect(events[0].eventName).toBe('need.rejected');
  });

  it('validate() throws NeedNotPendingError when already validated', () => {
    const need = makeNeed();
    need.validate();
    expect(() => need.validate()).toThrow(NeedNotPendingError);
  });

  it('reject() throws NeedNotPendingError when already rejected', () => {
    const need = makeNeed();
    need.reject();
    expect(() => need.reject()).toThrow(NeedNotPendingError);
  });

  it('validate() throws NeedNotPendingError when rejected', () => {
    const need = makeNeed();
    need.reject();
    expect(() => need.validate()).toThrow(NeedNotPendingError);
  });

  it('assignManager() sets the managing organization id', () => {
    const orgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const need = makeNeed();
    expect(need.managingOrganizationId).toBeNull();
    need.assignManager(orgId);
    expect(need.managingOrganizationId).toBe(orgId);
  });

  it('assignManager() can be called before or after validate()', () => {
    const orgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const need = makeNeed();
    need.validate();
    need.assignManager(orgId);
    expect(need.managingOrganizationId).toBe(orgId);
  });

  it('close() transitions Validated → Fulfilled', () => {
    const need = makeNeed();
    need.validate();
    need.close();
    expect(need.status).toBe(NeedStatus.Fulfilled);
  });

  it('close() throws when need is Pending', () => {
    const need = makeNeed();
    expect(() => need.close()).toThrow('Only validated needs can be closed');
  });

  it('pullDomainEvents() drains events (idempotent second call)', () => {
    const need = makeNeed();
    need.pullDomainEvents();
    expect(need.pullDomainEvents()).toHaveLength(0);
  });

  it('toSnapshot/fromSnapshot round-trip preserves all fields including items and location', () => {
    const need = makeNeed();
    need.validate();
    const orgId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    need.assignManager(orgId);

    const snap = need.toSnapshot();
    const restored = Need.fromSnapshot(snap);

    expect(restored.status).toBe(NeedStatus.Validated);
    expect(restored.title).toBe('Water for refugees');
    expect(restored.description).toBe('Urgent water supply needed');
    expect(restored.location.address).toBe('123 Main St, Caracas');
    expect(restored.location.latitude).toBe(10.4806);
    expect(restored.location.longitude).toBe(-66.9036);
    expect(restored.requesterUserId).toBe(USER_ID);
    expect(restored.managingOrganizationId).toBe(orgId);
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].name).toBe('Water bottles');
    expect(restored.pullDomainEvents()).toHaveLength(0);
  });

  it('handles null description and requesterOrganizationId', () => {
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Minimal need',
      description: null,
      location: makeLocation(),
      priority: Priority.Low,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: makeItems(),
    });
    expect(need.description).toBeNull();
    expect(need.requesterOrganizationId).toBeNull();
  });
});
