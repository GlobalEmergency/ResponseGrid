import {
  ALL_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  isPermission,
  type Permission,
} from './permission';

describe('permission catalog', () => {
  it('contains representative permissions across contexts', () => {
    const known: Permission[] = [
      'resource:verify',
      'role:grant',
      'group:manage_members',
      'apikey:create',
    ];
    for (const p of known) {
      expect(ALL_PERMISSIONS).toContain(p);
    }
  });

  it('includes the transport logistics permissions (EPIC #103)', () => {
    const logistics: Permission[] = [
      'shipment:create',
      'shipment:read',
      'shipment:track',
      'manifest:sign',
    ];
    for (const p of logistics) {
      expect(ALL_PERMISSIONS).toContain(p);
    }
    expect(isPermission('shipment:track')).toBe(true);
    // shipment:read is a `*:read`, so it joins the viewer/read-only set
    expect(READ_ONLY_PERMISSIONS).toContain('shipment:read');
  });

  it('includes the shipment expedition permissions (#106)', () => {
    expect(ALL_PERMISSIONS).toContain('shipment:assign');
    expect(ALL_PERMISSIONS).toContain('shipment:update');
    expect(isPermission('shipment:assign')).toBe(true);
    expect(isPermission('shipment:update')).toBe(true);
  });

  it('includes the transport-capacity permissions (#105)', () => {
    expect(ALL_PERMISSIONS).toContain('capacity:publish');
    expect(ALL_PERMISSIONS).toContain('capacity:read');
    expect(isPermission('capacity:publish')).toBe(true);
    // capacity:read is a `*:read`, so it joins the viewer/read-only set
    expect(READ_ONLY_PERMISSIONS).toContain('capacity:read');
  });

  it('has no duplicates', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('every permission matches the `resource:verb` shape', () => {
    for (const p of ALL_PERMISSIONS) {
      expect(p).toMatch(/^[a-z]+:[a-z_]+$/);
    }
  });

  it('READ_ONLY_PERMISSIONS are all `*:read` and a subset of the catalog', () => {
    for (const p of READ_ONLY_PERMISSIONS) {
      expect(p.endsWith(':read')).toBe(true);
      expect(ALL_PERMISSIONS).toContain(p);
    }
    expect(READ_ONLY_PERMISSIONS.length).toBeGreaterThan(0);
  });

  describe('isPermission()', () => {
    it('is true for a known permission', () => {
      expect(isPermission('resource:verify')).toBe(true);
    });
    it('is false for an unknown string', () => {
      expect(isPermission('resource:teleport')).toBe(false);
    });
  });
});
