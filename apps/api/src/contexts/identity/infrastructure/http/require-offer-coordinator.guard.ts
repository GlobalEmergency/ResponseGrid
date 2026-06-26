import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  OFFER_EMERGENCY_LOOKUP,
  type OfferEmergencyLookup,
} from '../../domain/ports/offer-emergency-lookup';
import type { MembershipRepository } from '../../domain/ports/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership.repository';
import { UserId } from '../../domain/user-id';
import { Role } from '../../domain/role';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Requires the authenticated user to be a Coordinator (or Admin) of the emergency
 * to which the offer identified by `:offerId` belongs.
 *
 * Must be used AFTER JwtAuthGuard so that `request.user` is already populated.
 */
@Injectable()
export class RequireOfferCoordinatorGuard implements CanActivate {
  constructor(
    @Inject(OFFER_EMERGENCY_LOOKUP)
    private readonly offerLookup: OfferEmergencyLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: AuthenticatedUser; params: { offerId?: string } }
      >();

    if (!request.user)
      throw new UnauthorizedException('Authentication required');
    if (request.user.isAdmin) return true;

    const { offerId } = request.params;
    if (!offerId) throw new ForbiddenException('Offer context required');

    const emergencyId = await this.offerLookup.findEmergencyId(offerId);
    if (emergencyId === null) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }

    const hasRole = await this.membershipRepo.hasRole(
      UserId.fromString(request.user.id),
      emergencyId,
      Role.Coordinator,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'Coordinator role required for this emergency',
      );
    }
    return true;
  }
}
