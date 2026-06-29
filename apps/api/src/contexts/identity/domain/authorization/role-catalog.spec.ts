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

  it('defines the logistics roles transportista and hub_manager (EPIC #103)', () => {
    expect(roleExists('transportista')).toBe(true);
    expect(roleExists('hub_manager')).toBe(true);

    const transportista = new Set(permissionsForRole('transportista'));
    expect(transportista.has('shipment:track')).toBe(true);
    expect(transportista.has('manifest:sign')).toBe(true);
    // a carrier executes shipments; coordination/hub creates them
    expect(transportista.has('shipment:create')).toBe(false);

    const hubManager = new Set(permissionsForRole('hub_manager'));
    expect(hubManager.has('shipment:create')).toBe(true);
    expect(hubManager.has('shipment:track')).toBe(true);
  });

  it('emergency_coordinator can read the audit trail but emergency_verifier cannot', () => {
    expect(
      new Set(permissionsForRole('emergency_coordinator')).has('audit:read'),
    ).toBe(true);
    expect(
      new Set(permissionsForRole('emergency_verifier')).has('audit:read'),
    ).toBe(false);
  });

  it('grants the coordinator the shipment expedition permissions (#106)', () => {
    const coordinator = new Set(permissionsForRole('emergency_coordinator'));
    expect(coordinator.has('shipment:create')).toBe(true);
    expect(coordinator.has('shipment:assign')).toBe(true);
    expect(coordinator.has('shipment:update')).toBe(true);
    expect(coordinator.has('shipment:read')).toBe(true);
  });

  it('wires the transport-capacity permissions (#105)', () => {
    // citizen publishes (grado ciudadano, como offer:create)
    expect(permissionsForRole('citizen')).toContain('capacity:publish');
    // coordination and verification read capacities (como offer:read)
    expect(permissionsForRole('emergency_coordinator')).toContain(
      'capacity:read',
    );
    expect(permissionsForRole('emergency_verifier')).toContain('capacity:read');
  });

  it('wires intake reception permissions (#15)', () => {
    const coordinator = new Set(permissionsForRole('emergency_coordinator'));
    expect(coordinator.has('intake:read')).toBe(true);
    expect(coordinator.has('intake:receive')).toBe(true);
    expect(permissionsForRole('emergency_verifier')).not.toContain(
      'intake:receive',
    );
  });

  it('wires the trackable-container permissions (#140)', () => {
    const coordinator = new Set(permissionsForRole('emergency_coordinator'));
    expect(coordinator.has('container:manage')).toBe(true);
    expect(coordinator.has('container:read')).toBe(true);
    // the hub manager manages logistics packaging too
    const hubManager = new Set(permissionsForRole('hub_manager'));
    expect(hubManager.has('container:manage')).toBe(true);
    // the verifier reads but does not manage
    const verifier = new Set(permissionsForRole('emergency_verifier'));
    expect(verifier.has('container:read')).toBe(true);
    expect(verifier.has('container:manage')).toBe(false);
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
