import { ROLE_CATALOG, roleExists, permissionsForRole } from './role-catalog';
import { ALL_PERMISSIONS } from './permission';

describe('ROLE_CATALOG', () => {
  it('platform_admin holds every permission in the catalog', () => {
    expect(new Set(permissionsForRole('platform_admin')).size).toBe(
      ALL_PERMISSIONS.length,
    );
  });

  it('group_manager can assign volunteers and create tasks but cannot verify resources', () => {
    const perms = new Set(permissionsForRole('group_manager'));
    expect(perms.has('volunteer:assign')).toBe(true);
    expect(perms.has('task:create')).toBe(true);
    expect(perms.has('resource:verify')).toBe(false);
  });

  it('viewer is read-only', () => {
    for (const p of permissionsForRole('viewer')) {
      expect(p.endsWith(':read')).toBe(true);
    }
  });

  it('every role only references permissions that exist in the catalog', () => {
    const valid = new Set<string>(ALL_PERMISSIONS);
    for (const role of Object.values(ROLE_CATALOG)) {
      for (const p of role.permissions) {
        expect(valid.has(p)).toBe(true);
      }
    }
  });

  describe('helpers', () => {
    it('roleExists() reflects the catalog', () => {
      expect(roleExists('emergency_coordinator')).toBe(true);
      expect(roleExists('nonexistent_role')).toBe(false);
    });
    it('permissionsForRole() returns [] for an unknown role', () => {
      expect(permissionsForRole('nope')).toEqual([]);
    });
  });
});
