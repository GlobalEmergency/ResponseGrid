import { EditResource } from './edit-resource';
import { RegisterResource } from './register-resource';
import { ResourceNotFoundError } from './resource-not-found.error';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceNotEditableError } from '../domain/resource-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('EditResource', () => {
  let repo: InMemoryResourceRepository;
  let bus: FakeEventBus;
  let editResource: EditResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    bus = new FakeEventBus();
    editResource = new EditResource(repo);
  });

  async function seed(): Promise<string> {
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Acopio Centro',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      ownerUserId: OWNER,
      contact: null,
      schedule: null,
    });
    return id;
  }

  it('applies the changes and reports the before/after diff', async () => {
    const id = await seed();

    const result = await editResource.execute({
      resourceId: id,
      name: 'Acopio Centro Norte',
      schedule: 'Lun-Vie 9-17',
    });

    const resource = await repo.findById(ResourceId.fromString(id));
    expect(resource!.name).toBe('Acopio Centro Norte');
    expect(resource!.schedule).toBe('Lun-Vie 9-17');

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBeNull();
    expect(result.changes).toEqual(
      expect.arrayContaining([
        {
          field: 'name',
          before: 'Acopio Centro',
          after: 'Acopio Centro Norte',
        },
        { field: 'schedule', before: null, after: 'Lun-Vie 9-17' },
      ]),
    );
    expect(result.changes).toHaveLength(2);
  });

  it('edits capacity, occupancy, source organisation and source url', async () => {
    const id = await seed();

    const result = await editResource.execute({
      resourceId: id,
      capacity: 200,
      occupancy: 120,
      sourceOrganisation: 'Protección Civil',
      sourceUrl: 'https://example.org/refugios/123',
    });

    const resource = await repo.findById(ResourceId.fromString(id));
    expect(resource!.capacity).toBe(200);
    expect(resource!.occupancy).toBe(120);
    expect(resource!.sourceOrganisation).toBe('Protección Civil');
    expect(resource!.sourceUrl).toBe('https://example.org/refugios/123');

    expect(result.changes).toEqual(
      expect.arrayContaining([
        { field: 'capacity', before: null, after: 200 },
        { field: 'occupancy', before: null, after: 120 },
        {
          field: 'sourceOrganisation',
          before: null,
          after: 'Protección Civil',
        },
        {
          field: 'sourceUrl',
          before: null,
          after: 'https://example.org/refugios/123',
        },
      ]),
    );
    expect(result.changes).toHaveLength(4);
  });

  it('clears the contact when an empty string is given', async () => {
    const id = await seed();
    await editResource.execute({ resourceId: id, contact: '+58 212 555' });

    const result = await editResource.execute({ resourceId: id, contact: '' });

    const resource = await repo.findById(ResourceId.fromString(id));
    expect(resource!.contact).toBeNull();
    expect(result.changes).toEqual([
      { field: 'contact', before: '+58 212 555', after: null },
    ]);
  });

  it('corrects the location in place and reports the coordinate diff', async () => {
    const id = await seed();

    const result = await editResource.execute({
      resourceId: id,
      location: { address: 'Av. Bolívar 5', latitude: 10.5, longitude: -66.92 },
    });

    const resource = await repo.findById(ResourceId.fromString(id));
    expect(resource!.location.toPlain()).toEqual({
      address: 'Av. Bolívar 5',
      latitude: 10.5,
      longitude: -66.92,
    });
    expect(result.changes).toEqual(
      expect.arrayContaining([
        { field: 'address', before: 'Caracas', after: 'Av. Bolívar 5' },
        { field: 'latitude', before: 10.48, after: 10.5 },
        { field: 'longitude', before: -66.9, after: -66.92 },
      ]),
    );
    expect(result.changes).toHaveLength(3);
  });

  it('throws ResourceNotFoundError for an unknown id', async () => {
    await expect(
      editResource.execute({ resourceId: OWNER, name: 'x' }),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it('cannot edit a discarded resource', async () => {
    const id = await seed();
    const resource = await repo.findById(ResourceId.fromString(id));
    resource!.discard();
    await repo.save(resource!);

    await expect(
      editResource.execute({ resourceId: id, name: 'x' }),
    ).rejects.toThrow(ResourceNotEditableError);
  });
});
