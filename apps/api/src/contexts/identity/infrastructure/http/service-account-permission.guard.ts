import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ACCESS_CONTROL } from '../../domain/authorization/access-control';
import type { AccessControl } from '../../domain/authorization/access-control';
import type { Permission } from '../../domain/authorization/permission';
import type { AuthenticatedUser } from './jwt-auth.guard';
import { REQUIRED_PERMISSION } from './require-permission.decorator';
import { SCOPE_RESOLVER } from './scope-resolver';
import type { ScopeResolver } from './scope-resolver';

/**
 * Conditional Policy Enforcement Point for the citizen-grade write endpoints
 * (create need / offer / resource). These endpoints are open to ANY
 * authenticated human (a citizen submits, a coordinator validates later), so a
 * blanket {@link PermissionGuard} would wrongly demand a grant from ordinary
 * users. But a SERVICE ACCOUNT acting on behalf of a third party must be
 * explicitly trusted: it may only write when it holds the declared permission
 * (e.g. `need:create`) at the request's scope — the "api-key + grant + author"
 * unlock of issue #235.
 *
 * So this guard enforces the {@link RequirePermission} permission ONLY for
 * service-account principals and is a no-op for human users (whose access is
 * already established by authentication). Runs after the auth guard, which
 * populates `request.user`.
 */
@Injectable()
export class ServiceAccountPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_CONTROL) private readonly access: AccessControl,
    @Inject(SCOPE_RESOLVER) private readonly scopeResolver: ScopeResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Human users keep the open citizen-grade flow — no grant required.
    if (!request.user.isServiceAccount) return true;

    const required = this.reflector.get<Permission | undefined>(
      REQUIRED_PERMISSION,
      context.getHandler(),
    );
    // No permission declared → nothing to enforce for the service account.
    if (!required) return true;

    const scopeChain = await this.scopeResolver.resolve(request);
    const allowed = await this.access.can(
      { principalId: request.user.id, grants: request.user.grants },
      required,
      { scopeChain },
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Service account is missing permission: ${required}`,
      );
    }
    return true;
  }
}
