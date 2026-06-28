import { CategoryResolver } from './category-resolver';

describe('CategoryResolver', () => {
  const map = new Map<string, string>([
    ['agua', 'water'],
    ['agua potable', 'water'],
    ['ropa', 'clothing'],
  ]);
  const r = new CategoryResolver(map);

  it('normaliza (lower, sin acentos, trim, espacios) y resuelve por alias', () => {
    expect(r.resolve('  Agua Potable ')).toBe('water');
  });

  it('no-match -> null', () => {
    expect(r.resolve('Arbol raro')).toBeNull();
  });

  it('resolveMany deduplica y descarta nulls', () => {
    expect(r.resolveMany(['Agua', 'ropa', 'Agua', 'xyz'])).toEqual([
      'water',
      'clothing',
    ]);
  });
});
