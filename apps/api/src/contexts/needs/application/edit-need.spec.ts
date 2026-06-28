import { EditNeed } from './edit-need';
import { CreateNeed } from './create-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority, NeedStatus } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedNotEditableError } from '../domain/need-errors';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedId } from '../domain/need-id';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('EditNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let editNeed: EditNeed;
  let createNeed: CreateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    editNeed = new EditNeed(repo);
    createNeed = new CreateNeed(repo, bus, activeReader);
  });

  async function seed(): Promise<string> {
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Agua',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      priority: Priority.Medium,
      items: [
        {
          name: 'Botellas',
          quantity: 10,
          unit: 'u',
          category: Category.Water,
        },
      ],
    });
    return id;
  }

  it('applies the changes and reports the before/after diff', async () => {
    const id = await seed();

    const result = await editNeed.execute({
      needId: id,
      title: 'Agua potable',
      description: 'Para 50 familias',
      priority: Priority.Urgent,
    });

    const need = await repo.findById(NeedId.fromString(id));
    expect(need!.title).toBe('Agua potable');
    expect(need!.description).toBe('Para 50 familias');
    expect(need!.priority).toBe(Priority.Urgent);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBeNull();
    expect(result.changes).toEqual(
      expect.arrayContaining([
        { field: 'title', before: 'Agua', after: 'Agua potable' },
        { field: 'description', before: null, after: 'Para 50 familias' },
        { field: 'priority', before: Priority.Medium, after: Priority.Urgent },
      ]),
    );
    expect(result.changes).toHaveLength(3);
  });

  it('leaves omitted fields untouched and reports no change for them', async () => {
    const id = await seed();

    const result = await editNeed.execute({
      needId: id,
      title: 'Agua potable',
    });

    expect(result.changes).toEqual([
      { field: 'title', before: 'Agua', after: 'Agua potable' },
    ]);
  });

  it('clears the description when an empty string is given', async () => {
    const id = await seed();
    await editNeed.execute({ needId: id, description: 'algo' });

    const result = await editNeed.execute({ needId: id, description: '' });

    const need = await repo.findById(NeedId.fromString(id));
    expect(need!.description).toBeNull();
    expect(result.changes).toEqual([
      { field: 'description', before: 'algo', after: null },
    ]);
  });

  it('throws NeedNotFoundError for an unknown id', async () => {
    await expect(
      editNeed.execute({ needId: USER_ID, title: 'x' }),
    ).rejects.toThrow(NeedNotFoundError);
  });

  it('refuses to edit a discarded (rejected) need', async () => {
    const id = await seed();
    const need = await repo.findById(NeedId.fromString(id));
    need!.reject();
    await repo.save(need!);

    await expect(editNeed.execute({ needId: id, title: 'x' })).rejects.toThrow(
      NeedNotEditableError,
    );
  });

  it('reports an empty diff when nothing actually changed', async () => {
    const id = await seed();

    const result = await editNeed.execute({ needId: id, title: 'Agua' });

    expect(result.changes).toEqual([]);
    const need = await repo.findById(NeedId.fromString(id));
    expect(need!.status).toBe(NeedStatus.Pending);
  });
});
