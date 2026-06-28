import { deriveGrantsFromLegacy } from './legacy-grant-mapping';
import { Role } from '../role';

const USER = '11111111-1111-4111-8111-111111111111';

describe('deriveGrantsFromLegacy', () => {
  it('maps isAdmin to a platform_admin grant', () => {
    const grants = deriveGrantsFromLegacy(USER, true, []);
    expect(grants).toHaveLength(1);
    expect(grants[0].roleId).toBe('platform_admin');
    expect(grants[0].scope).toEqual({ type: 'platform' });
  });

  it('maps coordinator and verifier memberships to emergency-scoped grants', () => {
    const grants = deriveGrantsFromLegacy(USER, false, [
      { id: 'm1', userId: USER, emergencyId: 'e1', role: Role.Coordinator },
      { id: 'm2', userId: USER, emergencyId: 'e2', role: Role.Verifier },
    ]);
    expect(grants.map((g) => g.roleId).sort()).toEqual([
      'emergency_coordinator',
      'emergency_verifier',
    ]);
    expect(grants[0].scope).toEqual({ type: 'emergency', id: 'e1' });
  });

  it('returns nothing for a plain authenticated user', () => {
    expect(deriveGrantsFromLegacy(USER, false, [])).toEqual([]);
  });
});
