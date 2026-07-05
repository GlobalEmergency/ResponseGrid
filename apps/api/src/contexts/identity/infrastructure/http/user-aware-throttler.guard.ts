import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Derives the throttle key from the AUTHENTICATED USER instead of the source
 * IP. Pairs with the global per-IP {@link ApiKeyAwareThrottlerGuard}: applying
 * both to a route yields two independent buckets (per-IP and per-user), so a
 * user who rotates IPs is still capped and cannot overflood an endpoint. Falls
 * back to the IP when there is no authenticated user (defence in depth).
 *
 * Extracted as a pure function so it can be unit-tested without the throttler
 * runtime (mirrors `apiKeyThrottleTracker`).
 */
export function userThrottleTracker(req: {
  user?: { id?: string };
  ip?: string;
}): string {
  return req.user?.id ?? req.ip ?? '';
}

/**
 * Route-level rate-limit guard that keys by the authenticated user id. MUST run
 * AFTER the guard that populates `req.user` (e.g. `JwtAuthGuard`); bind it as
 * `@UseGuards(JwtAuthGuard, UserAwareThrottlerGuard)`. Not global — the global
 * throttler runs before authentication, so per-user keying only works here.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(
      userThrottleTracker(req as { user?: { id?: string }; ip?: string }),
    );
  }
}
