import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../domain/role';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Requires authenticated user to be a Coordinator in the emergency identified by
 * the `emergencyId` route parameter.
 *
 * Uses the memberships already loaded by JwtAuthGuard (request.user.memberships)
 * to avoid a second database round-trip per request.
 */
@Injectable()
export class RequireCoordinatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: AuthenticatedUser; params: { emergencyId?: string } }
      >();

    if (!request.user)
      throw new UnauthorizedException('Authentication required');

    // Admins bypass membership checks
    if (request.user.isAdmin) return true;

    const emergencyId = request.params.emergencyId;
    if (!emergencyId)
      throw new ForbiddenException('Emergency context required');

    const hasRole = request.user.memberships.some(
      (m) => m.emergencyId === emergencyId && m.role === Role.Coordinator,
    );

    if (!hasRole)
      throw new ForbiddenException(
        'Coordinator role required for this emergency',
      );
    return true;
  }
}
