import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import type { TokenService } from '../../domain/ports/token.service';
import { TOKEN_SERVICE } from '../../domain/ports/token.service';
import type { UserRepository } from '../../domain/ports/user.repository';
import { USER_REPOSITORY } from '../../domain/ports/user.repository';
import type { MembershipRepository } from '../../domain/ports/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership.repository';
import type { GrantRepository } from '../../domain/ports/grant.repository';
import { GRANT_REPOSITORY } from '../../domain/ports/grant.repository';
import { UserId } from '../../domain/user-id';
import { deriveGrantsFromLegacy } from '../../domain/authorization/legacy-grant-mapping';
import { AuthenticatedUser } from './jwt-auth.guard';

/**
 * Optional JWT guard: if a valid Bearer token is present, it sets req.user.
 * If no token is present (or the token is invalid), it allows the request
 * through without setting req.user. Use this on public endpoints that gain
 * extra functionality when the caller is authenticated.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
    @Inject(GRANT_REPOSITORY)
    private readonly grantRepo: GrantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return true; // no token → allow through

    const token = auth.slice(7);
    let payload: { sub: string; email: string; isAdmin: boolean };
    try {
      payload = this.tokenService.verify(token);
    } catch {
      return true; // invalid token → silently ignore
    }

    try {
      const user = await this.userRepo.findById(UserId.fromString(payload.sub));
      if (!user) return true;
      const memberships = await this.membershipRepo.findByUser(user.id);
      const membershipSnapshots = memberships.map((m) => m.toSnapshot());
      const persistedGrants = await this.grantRepo.findByPrincipal(
        user.id.value,
      );
      request.user = {
        id: user.id.value,
        email: user.email.value,
        name: user.name,
        isAdmin: user.isAdmin,
        memberships: membershipSnapshots,
        grants: [
          ...deriveGrantsFromLegacy(
            user.id.value,
            user.isAdmin,
            membershipSnapshots,
          ),
          ...persistedGrants.map((g) => g.toSnapshot()),
        ],
      };
    } catch {
      // If anything fails, proceed unauthenticated
    }

    return true;
  }
}
