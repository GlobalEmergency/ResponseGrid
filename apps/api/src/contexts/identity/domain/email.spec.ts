import { Email } from './email';

describe('Email', () => {
  it('accepts a valid email and normalises to lowercase', () => {
    const email = Email.fromString('Admin@ReliefHub.org');
    expect(email.value).toBe('admin@reliefhub.org');
  });

  it('trims whitespace', () => {
    const email = Email.fromString('  user@example.com  ');
    expect(email.value).toBe('user@example.com');
  });

  it('throws on missing @', () => {
    expect(() => Email.fromString('notanemail')).toThrow('Invalid email');
  });

  it('throws on missing domain', () => {
    expect(() => Email.fromString('user@')).toThrow('Invalid email');
  });

  it('throws on empty string', () => {
    expect(() => Email.fromString('')).toThrow('Invalid email');
  });

  it('equals returns true for same value', () => {
    const a = Email.fromString('user@example.com');
    const b = Email.fromString('user@example.com');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different addresses', () => {
    const a = Email.fromString('a@example.com');
    const b = Email.fromString('b@example.com');
    expect(a.equals(b)).toBe(false);
  });
});
