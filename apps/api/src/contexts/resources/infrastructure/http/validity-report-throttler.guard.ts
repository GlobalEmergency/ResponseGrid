import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ACCESS_CONTROL } from '../../../identity/domain/authorization/access-control';
import type { AccessControl } from '../../../identity/domain/authorization/access-control';
import { SCOPE_RESOLVER } from '../../../identity/infrastructure/http/scope-resolver';
import type { ScopeResolver } from '../../../identity/infrastructure/http/scope-resolver';
import type { AuthenticatedUser } from '../../../identity/infrastructure/http/jwt-auth.guard';

/** Reports allowed per rolling window, applied independently to IP and user. */
const LIMIT = 20;
/** Rolling window: one hour. */
const WINDOW_MS = 3_600_000;

/**
 * Anti-overflood guard for `POST /validity-reports`. The named-throttler
 * machinery can only key one bucket per route and every named throttler leaks
 * onto every route, so this dedicated guard owns the limit instead:
 *
 *  1. **Bypass** — a trusted verifier (anyone the PDP grants `resource:verify`
 *     on the target resource's scope: coordinators/verifiers, and admins via
 *     platform grants) is never throttled. Runs the same `can()` check as
 *     {@link PermissionGuard}, so the seam is the authorization model (OCP).
 *  2. Otherwise it enforces **two independent buckets** — per IP and per user —
 *     each `LIMIT`/hour. The per-user bucket survives IP rotation; the per-IP
 *     bucket caps distributed abuse from one origin. Exceeding either → 429.
 *
 * MUST run AFTER `JwtAuthGuard` (needs `req.user`); the coarse per-IP DoS floor
 * (global `default` throttler, 200/min) still runs pre-auth and is intentionally
 * left in place for everyone, including verifiers.
 */
@Injectable()
export class ValidityReportThrottlerGuard implements CanActivate {
  constructor(
    @InjectThrottlerStorage() private readonly storage: ThrottlerStorage,
    @InjectThrottlerOptions() private readonly options: ThrottlerModuleOptions,
    @Inject(ACCESS_CONTROL) private readonly access: AccessControl,
    @Inject(SCOPE_RESOLVER) private readonly scopeResolver: ScopeResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // No throttling configured (test env uses an empty ruleset) → no-op, mirrors
    // the global guard so tests are not rate-limited.
    const rules = Array.isArray(this.options)
      ? this.options
      : this.options.throttlers;
    if (!rules || rules.length === 0) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    // JwtAuthGuard guarantees a user upstream; be defensive rather than crash.
    if (!user) return true;

    // 1. Trusted verifiers bypass the anti-abuse limit entirely.
    const scopeChain = await this.scopeResolver.resolve(req);
    const isVerifier = await this.access.can(
      { principalId: user.id, grants: user.grants },
      'resource:verify',
      { scopeChain },
    );
    if (isVerifier) return true;

    // 2. Enforce per-IP and per-user buckets; either overflow → 429.
    const ip = req.ip ?? '';
    await this.hit(`validity-report:ip:${ip}`);
    await this.hit(`validity-report:user:${user.id}`);
    return true;
  }

  private async hit(key: string): Promise<void> {
    const { isBlocked } = await this.storage.increment(
      key,
      WINDOW_MS,
      LIMIT,
      WINDOW_MS,
      'validity-report',
    );
    if (isBlocked) throw new ThrottlerException();
  }
}
