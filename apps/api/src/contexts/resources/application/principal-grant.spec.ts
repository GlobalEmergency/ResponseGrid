import { grantedResourceIds, PrincipalGrant } from './principal-grant';

const R1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NOW = new Date('2026-07-02T12:00:00Z');

function grant(overrides: Partial<PrincipalGrant> = {}): PrincipalGrant {
  return {
    roleId: 'point_manager',
    scope: { type: 'entity', entityType: 'resource', id: R1 },
    expiresAt: null,
    ...overrides,
  };
}

describe('grantedResourceIds', () => {
  it('collects the ids of active entity-scoped resource grants', () => {
    const ids = grantedResourceIds(
      [
        grant({ scope: { type: 'entity', entityType: 'resource', id: R1 } }),
        grant({ scope: { type: 'entity', entityType: 'resource', id: R2 } }),
      ],
      NOW,
    );
    expect([...ids].sort()).toEqual([R1, R2].sort());
  });

  it('treats a null expiry as always active', () => {
    expect(grantedResourceIds([grant({ expiresAt: null })], NOW).has(R1)).toBe(
      true,
    );
  });

  it('ignores grants expired at or before now', () => {
    expect(
      grantedResourceIds([grant({ expiresAt: '2026-07-01T00:00:00Z' })], NOW)
        .size,
    ).toBe(0);
  });

  it('ignores grants that are not entity-scoped to a resource', () => {
    const ids = grantedResourceIds(
      [
        grant({ scope: { type: 'emergency', id: R1 } }),
        grant({ scope: { type: 'entity', entityType: 'group', id: R1 } }),
      ],
      NOW,
    );
    expect(ids.size).toBe(0);
  });

  it('ignores an entity resource grant with no id', () => {
    const ids = grantedResourceIds(
      [grant({ scope: { type: 'entity', entityType: 'resource' } })],
      NOW,
    );
    expect(ids.size).toBe(0);
  });

  it('returns an empty set when there are no grants', () => {
    expect(grantedResourceIds([], NOW).size).toBe(0);
  });
});
