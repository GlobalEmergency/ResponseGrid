import { userThrottleTracker } from './user-aware-throttler.guard';

describe('userThrottleTracker', () => {
  it('keys by the authenticated user id (not the IP)', () => {
    expect(userThrottleTracker({ user: { id: 'user-1' }, ip: '1.2.3.4' })).toBe(
      'user-1',
    );
  });

  it('falls back to the IP when there is no authenticated user', () => {
    expect(userThrottleTracker({ ip: '9.9.9.9' })).toBe('9.9.9.9');
  });

  it('returns an empty string when neither a user nor an IP is present', () => {
    expect(userThrottleTracker({})).toBe('');
  });
});
