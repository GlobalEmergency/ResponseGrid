import { ApiKey } from './api-key';

const NOW = new Date('2026-06-28T00:00:00.000Z');
const base = {
  id: 'k1',
  prefix: 'rh_live_ab12cd34',
  hashedSecret: 'hash',
  serviceAccountId: 'sa1',
  createdByUserId: 'u1',
};

describe('ApiKey', () => {
  it('a fresh key with no expiry is active', () => {
    expect(ApiKey.issue(base).isActive(NOW)).toBe(true);
  });

  it('an expired key is inactive', () => {
    const key = ApiKey.issue({
      ...base,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    expect(key.isActive(NOW)).toBe(false);
  });

  it('a revoked key is inactive even before expiry', () => {
    const key = ApiKey.issue(base).revoke(NOW);
    expect(key.revokedAt).not.toBeNull();
    expect(key.isActive(new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('round-trips through a snapshot (with expiry and last-used)', () => {
    const key = ApiKey.issue({
      ...base,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    }).markUsed(NOW);
    expect(ApiKey.fromSnapshot(key.toSnapshot()).toSnapshot()).toEqual(
      key.toSnapshot(),
    );
  });
});
