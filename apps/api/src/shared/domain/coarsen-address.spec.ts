import { coarsenAddress } from './coarsen-address';

describe('coarsenAddress', () => {
  it('drops the street line and keeps the locality context', () => {
    expect(
      coarsenAddress('Calle Los Rosales #123, Apt 4B, Chacao, Caracas'),
    ).toBe('Apt 4B, Chacao, Caracas');
  });

  it('keeps a simple city tail when only two segments are present', () => {
    expect(coarsenAddress('Av. Principal 45, Caracas')).toBe('Caracas');
  });

  it('returns null for a single-segment address (assumed to be a street line)', () => {
    expect(coarsenAddress('Calle Los Rosales #123')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(coarsenAddress(null)).toBeNull();
  });

  it('returns null for a blank / comma-only address', () => {
    expect(coarsenAddress('   ')).toBeNull();
    expect(coarsenAddress(', ,')).toBeNull();
  });

  it('trims whitespace around retained segments', () => {
    expect(coarsenAddress('Calle 1 ,  Baruta ,  Miranda ')).toBe(
      'Baruta, Miranda',
    );
  });
});
