import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { prefixOf } from '../../domain/api-key-generator';

/**
 * Derives the throttle key for a request. For API-key (service-account) traffic
 * it keys by the KEY PREFIX rather than the source IP: a bot's requests all come
 * from one server, so per-IP would lump every trusted channel together and let
 * one noisy bot starve the others. The prefix identifies the credential (a
 * finer, safer grain than per-IP); everything else keeps the stock per-IP
 * tracker. Extracted as a pure function so it can be unit-tested without the
 * throttler runtime (#315).
 */
export function apiKeyThrottleTracker(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const header = req.headers['x-api-key'];
  const presented = Array.isArray(header) ? header[0] : header;
  const prefix = typeof presented === 'string' ? prefixOf(presented) : null;
  return prefix ?? req.ip ?? '';
}

/**
 * Global rate-limit guard that keys trusted-channel (API-key) traffic by the
 * API-key prefix instead of the client IP (#315). A drop-in replacement for the
 * stock {@link ThrottlerGuard}: identical behaviour for every non-API-key
 * request (still per-IP).
 */
@Injectable()
export class ApiKeyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(
      apiKeyThrottleTracker(
        req as unknown as {
          headers: Record<string, string | string[] | undefined>;
          ip?: string;
        },
      ),
    );
  }
}
