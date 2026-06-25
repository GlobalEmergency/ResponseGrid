import { ResourceId } from './resource-id';

describe('ResourceId', () => {
  it('generates a valid uuid and round-trips through a string', () => {
    const id = ResourceId.create();
    expect(id.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(ResourceId.fromString(id.value).equals(id)).toBe(true);
  });

  it('rejects a non-uuid string', () => {
    expect(() => ResourceId.fromString('nope')).toThrow();
  });
});
