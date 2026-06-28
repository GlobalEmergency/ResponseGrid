import { Grant } from './grant';
import { ScopeRef } from './scope-ref';

const G_ID = 'g-1';
const P_ID = '11111111-1111-4111-8111-111111111111';

describe('Grant', () => {
  it('create() applies sensible defaults', () => {
    const grant = Grant.create({
      id: G_ID,
      principalId: P_ID,
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency('e1'),
    });
    expect(grant.principalType).toBe('user');
    expect(grant.grantedByPrincipalId).toBeNull();
    expect(grant.expiresAt).toBeNull();
  });

  it('round-trips through a snapshot', () => {
    const grant = Grant.create({
      id: G_ID,
      principalId: P_ID,
      roleId: 'group_manager',
      scope: ScopeRef.group('grp-1'),
      grantedByPrincipalId: 'admin-1',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    const restored = Grant.fromSnapshot(grant.toSnapshot());
    expect(restored.toSnapshot()).toEqual(grant.toSnapshot());
    expect(restored.scope.equals(ScopeRef.group('grp-1'))).toBe(true);
  });

  describe('isActive()', () => {
    const now = new Date('2026-06-27T00:00:00.000Z');

    it('a grant with no expiry is always active', () => {
      const grant = Grant.create({
        id: G_ID,
        principalId: P_ID,
        roleId: 'viewer',
        scope: ScopeRef.platform(),
      });
      expect(grant.isActive(now)).toBe(true);
    });

    it('a future expiry is active', () => {
      const grant = Grant.create({
        id: G_ID,
        principalId: P_ID,
        roleId: 'viewer',
        scope: ScopeRef.platform(),
        expiresAt: new Date('2026-06-28T00:00:00.000Z'),
      });
      expect(grant.isActive(now)).toBe(true);
    });

    it('a past expiry is inactive (break-glass / temporary grants expire)', () => {
      const grant = Grant.create({
        id: G_ID,
        principalId: P_ID,
        roleId: 'viewer',
        scope: ScopeRef.platform(),
        expiresAt: new Date('2026-06-26T00:00:00.000Z'),
      });
      expect(grant.isActive(now)).toBe(false);
    });
  });
});
