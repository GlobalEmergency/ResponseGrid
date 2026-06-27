import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { MembershipRepository } from '../../domain/ports/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership.repository';
import { UserId } from '../../domain/user-id';
import { Role } from '../../domain/role';
import { AuthenticatedUser } from './jwt-auth.guard';

interface EmergencyLookup {
  findEmergencyId(entityId: string): Promise<string | null>;
}

/**
 * Factory that produces a NestJS guard class requiring the authenticated user to be
 * a Coordinator (or Admin) of the emergency that owns the given entity.
 *
 * @param lookupToken   DI token for the *EmergencyLookup port of the entity's context.
 * @param paramName     Route-param key holding the entity UUID (e.g. `'needId'`).
 * @param entityLabel   Human-readable name used in error messages (e.g. `'Need'`).
 */
export function makeEntityCoordinatorGuard(
  lookupToken: symbol,
  paramName: string,
  entityLabel: string,
): Type<CanActivate> {
  @Injectable()
  class EntityCoordinatorGuard implements CanActivate {
    constructor(
      @Inject(lookupToken)
      private readonly lookup: EmergencyLookup,
      @Inject(MEMBERSHIP_REPOSITORY)
      private readonly membershipRepo: MembershipRepository,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<
        Request & {
          user?: AuthenticatedUser;
          params: Record<string, string | undefined>;
        }
      >();

      if (!request.user)
        throw new UnauthorizedException('Authentication required');
      if (request.user.isAdmin) return true;

      const entityId = request.params[paramName];
      if (!entityId)
        throw new ForbiddenException(`${entityLabel} context required`);

      const emergencyId = await this.lookup.findEmergencyId(entityId);
      if (emergencyId === null) {
        throw new NotFoundException(`${entityLabel} ${entityId} not found`);
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

  return EntityCoordinatorGuard;
}
