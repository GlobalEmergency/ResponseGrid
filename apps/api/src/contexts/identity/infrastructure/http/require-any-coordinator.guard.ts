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
 * Requires the authenticated user to hold at least one Coordinator membership
 * across any emergency.
 *
 * NOTE: This is a simplified guard for endpoints that don't have an emergencyId
 * route param (e.g. POST /resources/:resourceId/verify). Ideally we would resolve
 * the emergency from the resource and check the specific membership — that would
 * require a cross-context query or an anti-corruption layer. For now we accept
 * any coordinator as a pragmatic approximation.
 */
@Injectable()
export class RequireAnyCoordinatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) throw new UnauthorizedException('Authentication required');

    // Admins bypass membership checks
    if (request.user.isAdmin) return true;

    const hasCoordinatorMembership = request.user.memberships.some(
      (m) => m.role === Role.Coordinator,
    );

    if (!hasCoordinatorMembership) {
      throw new ForbiddenException('Coordinator role required');
    }

    return true;
  }
}
