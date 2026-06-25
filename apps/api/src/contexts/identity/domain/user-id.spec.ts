import { UserId } from './user-id';

describe('UserId', () => {
  it('creates a valid UUID', () => {
    const id = UserId.create();
    expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('fromString accepts a valid UUID', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const id = UserId.fromString(uuid);
    expect(id.value).toBe(uuid);
  });

  it('fromString throws on invalid UUID', () => {
    expect(() => UserId.fromString('not-a-uuid')).toThrow('Invalid UserId');
  });

  it('equals returns true for same value', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    expect(UserId.fromString(uuid).equals(UserId.fromString(uuid))).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = UserId.fromString('11111111-1111-4111-8111-111111111111');
    const b = UserId.fromString('22222222-2222-4222-8222-222222222222');
    expect(a.equals(b)).toBe(false);
  });
});
