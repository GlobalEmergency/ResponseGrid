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

    const key = await this.keys.findByPrefix(prefix);
    if (
      !key ||
      !key.isActive(new Date()) ||
      !verifyApiKeySecret(presented, key.hashedSecret)
    ) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    const grants = await this.grants.findByPrincipal(key.serviceAccountId);
    request.user = {
      id: key.serviceAccountId,
      email: '',
      name: 'service-account',
      isAdmin: false,
      memberships: [],
      grants: grants.map((g) => g.toSnapshot()),
    };
    return true;
  }
}
