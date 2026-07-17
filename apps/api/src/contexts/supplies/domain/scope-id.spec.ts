import {
  ScopeId,
  ScopeIdValidationError,
} from '@globalemergency/warehouse-core/kernel';

describe('ScopeId', () => {
  it('create() genera un id no vacío', () => {
    const id = ScopeId.create();
    expect(id.value).toBeTruthy();
    expect(id.value.length).toBeGreaterThan(0);
  });

  it('fromString acepta cualquier string no vacío y lo recorta', () => {
    expect(ScopeId.fromString('org-123').value).toBe('org-123');
    expect(ScopeId.fromString('  abc  ').value).toBe('abc');
    // No exige formato UUID: es un id de owner opaco y genérico.
    expect(
      ScopeId.fromString('11111111-1111-4111-8111-111111111111').value,
    ).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('fromString rechaza vacío o solo espacios', () => {
    expect(() => ScopeId.fromString('')).toThrow(ScopeIdValidationError);
    expect(() => ScopeId.fromString('   ')).toThrow(ScopeIdValidationError);
  });

  it('equals compara por valor', () => {
    expect(ScopeId.fromString('a').equals(ScopeId.fromString('a'))).toBe(true);
    expect(ScopeId.fromString('a').equals(ScopeId.fromString('b'))).toBe(false);
  });
});
