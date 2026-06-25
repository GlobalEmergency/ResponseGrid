import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { MembershipRepository } from '../../domain/ports/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership.repository';
import { UserId } from '../../domain/user-id';
import { Role } from '../../domain/role';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Requires authenticated user to be a Coordinator in the emergency identified by
 * the `emergencyId` route parameter.
 */
@Injectable()
export class RequireCoordinatorGuard implements CanActivate {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: MembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; params: { emergencyId?: string } }>();

    if (!request.user) throw new UnauthorizedException('Authentication required');

    // Admins bypass membership checks
    if (request.user.isAdmin) return true;

    const emergencyId = request.params.emergencyId;
    if (!emergencyId) throw new ForbiddenException('Emergency context required');

    const hasRole = await this.membershipRepo.hasRole(
      UserId.fromString(request.user.id),
      emergencyId,
      Role.Coordinator,
    );

    if (!hasRole) throw new ForbiddenException('Coordinator role required for this emergency');
    return true;
  }
}
