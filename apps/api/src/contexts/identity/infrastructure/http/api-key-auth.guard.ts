import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { API_KEY_REPOSITORY } from '../../domain/ports/api-key.repository';
import type { ApiKeyRepository } from '../../domain/ports/api-key.repository';
import { GRANT_REPOSITORY } from '../../domain/ports/grant.repository';
import type { GrantRepository } from '../../domain/ports/grant.repository';
import { prefixOf, verifyApiKeySecret } from '../../domain/api-key-generator';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Authenticates a request via the `X-API-Key` header. Resolves the key to its
 * service-account principal and loads that principal's grants, then populates
 * `request.user` in the same shape as JwtAuthGuard — so the PermissionGuard and
 * the single can() decision point work unchanged. See docs/features/13 §8.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  /** Minimum gap between `lastUsedAt` writes for the same key. */
  private static readonly USAGE_THROTTLE_MS = 5 * 60 * 1000;

  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(GRANT_REPOSITORY) private readonly grants: GrantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const header = request.headers['x-api-key'];
    const presented = Array.isArray(header) ? header[0] : header;
    if (!presented) throw new UnauthorizedException('Missing API key');

    const prefix = prefixOf(presented);
    if (!prefix) throw new UnauthorizedException('Malformed API key');

    const now = new Date();
    const key = await this.keys.findByPrefix(prefix);
    if (
      !key ||
      !key.isActive(now) ||
      !verifyApiKeySecret(presented, key.hashedSecret)
    ) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Record usage for leak detection, throttled so we don't write on every
    // request (the secret hash never changes, so a coarse last-used is enough).
    if (
      key.lastUsedAt === null ||
      now.getTime() - key.lastUsedAt.getTime() >
        ApiKeyAuthGuard.USAGE_THROTTLE_MS
    ) {
      try {
        await this.keys.save(key.markUsed(now));
      } catch {
        // Best-effort usage telemetry: a transient write failure must never
        // fail an otherwise-valid API-key request.
      }
    }

    const grants = await this.grants.findByPrincipal(key.serviceAccountId);
    request.user = {
      id: key.serviceAccountId,
      email: '',
      name: 'service-account',
      isAdmin: false,
      phone: null,
      memberships: [],
      grants: grants.map((g) => g.toSnapshot()),
      isServiceAccount: true,
    };
    return true;
  }
}
