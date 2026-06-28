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
 * Single permission-based Policy Enforcement Point. Reads the permission
 * declared by {@link RequirePermission}, resolves the request's scope chain and
 * asks the AccessControl PDP whether the authenticated principal's grants confer
 * it. Replaces the bespoke Require*CoordinatorGuard family (docs/features/13 §9).
 *
 * Runs after JwtAuthGuard, which populates `request.user.grants`.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_CONTROL) private readonly access: AccessControl,
    @Inject(SCOPE_RESOLVER) private readonly scopeResolver: ScopeResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<Permission | undefined>(
      REQUIRED_PERMISSION,
      context.getHandler(),
    );
    // No permission declared → this guard is a no-op (route guarded elsewhere).
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const scopeChain = await this.scopeResolver.resolve(request);
    const allowed = await this.access.can(
      { principalId: request.user.id, grants: request.user.grants },
      required,
      { scopeChain },
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
    return true;
  }
}
