import { EmergencyId } from './emergency-id';

describe('EmergencyId', () => {
  it('creates a valid uuid', () => {
    const id = EmergencyId.create();
    expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('round-trips through fromString', () => {
    const id = EmergencyId.create();
    expect(EmergencyId.fromString(id.value).equals(id)).toBe(true);
  });

  it('rejects a non-uuid string', () => {
    expect(() => EmergencyId.fromString('not-a-uuid')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => EmergencyId.fromString('')).toThrow();
  });

  it('equals returns false for different ids', () => {
    const a = EmergencyId.create();
    const b = EmergencyId.create();
    expect(a.equals(b)).toBe(false);
  });
});
