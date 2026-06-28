import { Group } from './group';
import { GroupVisibility } from './group-enums';

const ID = '11111111-1111-4111-8111-111111111111';

describe('Group', () => {
  it('creates an emergency-owned public group and round-trips', () => {
    const group = Group.create({
      id: ID,
      name: '  Cuadrilla Norte  ',
      visibility: GroupVisibility.Public,
      ownerScope: { kind: 'emergency', emergencyId: 'e1' },
    });
    expect(group.name).toBe('Cuadrilla Norte'); // trimmed
    expect(group.isPublic).toBe(true);
    expect(group.parentGroupId).toBeNull();

    const restored = Group.fromSnapshot(group.toSnapshot());
    expect(restored.toSnapshot()).toEqual(group.toSnapshot());
  });

  it('supports an organization-owned group', () => {
    const group = Group.create({
      id: ID,
      name: 'Equipo logística',
      visibility: GroupVisibility.Private,
      ownerScope: { kind: 'organization', organizationId: 'o1' },
    });
    expect(group.ownerScope).toEqual({
      kind: 'organization',
      organizationId: 'o1',
    });
    expect(group.isPublic).toBe(false);
  });

  it('throws on an empty name', () => {
    expect(() =>
      Group.create({
        id: ID,
        name: '   ',
        visibility: GroupVisibility.Public,
        ownerScope: { kind: 'emergency', emergencyId: 'e1' },
      }),
    ).toThrow();
  });
});
