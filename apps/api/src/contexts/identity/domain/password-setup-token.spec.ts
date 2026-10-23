import { PasswordSetupToken } from './password-setup-token';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  tokenHash: 'a'.repeat(64),
};

describe('PasswordSetupToken', () => {
  it('is usable while unused and unexpired', () => {
    const now = new Date('2026-07-17T12:00:00Z');
    const token = PasswordSetupToken.issue({
      ...base,
      expiresAt: new Date('2026-07-19T12:00:00Z'),
      createdAt: now,
    });
    expect(token.isUsable(now)).toBe(true);
  });

  it('is not usable once expired', () => {
    const token = PasswordSetupToken.issue({
      ...base,
      expiresAt: new Date('2026-07-17T12:00:00Z'),
    });
    expect(token.isUsable(new Date('2026-07-17T12:00:01Z'))).toBe(false);
  });

  it('is not usable once marked used (single-use)', () => {
    const now = new Date('2026-07-17T12:00:00Z');
    const token = PasswordSetupToken.issue({
      ...base,
      expiresAt: new Date('2026-07-19T12:00:00Z'),
      createdAt: now,
    });
    const used = token.markUsed(now);
    expect(used.isUsable(now)).toBe(false);
    expect(used.usedAt).toEqual(now);
  });

  it('round-trips through a snapshot', () => {
    const token = PasswordSetupToken.issue({
      ...base,
      expiresAt: new Date('2026-07-19T12:00:00Z'),
      createdAt: new Date('2026-07-17T12:00:00Z'),
    });
    const restored = PasswordSetupToken.fromSnapshot(token.toSnapshot());
    expect(restored.toSnapshot()).toEqual(token.toSnapshot());
  });
});
