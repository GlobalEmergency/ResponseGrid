import { normalizePhone } from './phone-normalization';

describe('normalizePhone', () => {
  it('strips spaces, dashes, parentheses, dots and the leading +', () => {
    expect(normalizePhone('+58 412-555.0101')).toBe('584125550101');
    expect(normalizePhone('(0412) 555 0101')).toBe('04125550101');
  });

  it('is idempotent on an already-clean number', () => {
    expect(normalizePhone('584125550101')).toBe('584125550101');
  });

  it('makes two differently-formatted equal numbers compare equal', () => {
    expect(normalizePhone('+58 412 555 0101')).toBe(
      normalizePhone('+584125550101'),
    );
  });

  it('returns an empty string for input with no digits', () => {
    expect(normalizePhone('   ')).toBe('');
    expect(normalizePhone('+-()')).toBe('');
  });
});
