import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import type { TokenService } from '../../domain/ports/token.service';
import { TOKEN_SERVICE } from '../../domain/ports/token.service';
import type { UserRepository } from '../../domain/ports/user.repository';
import { USER_REPOSITORY } from '../../domain/ports/user.repository';
import type { MembershipRepository } from '../../domain/ports/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership.repository';
import { UserId } from '../../domain/user-id';
import type { MembershipSnapshot } from '../../domain/membership';

export interface AuthenticatedUser {
  id: string;
  email: string;
  isAdmin: boolean;
  memberships: MembershipSnapshot[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: MembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Missing authorization token');

    let payload: { sub: string; email: string; isAdmin: boolean };
    try {
      payload = this.tokenService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userRepo.findById(UserId.fromString(payload.sub));
    if (!user) throw new UnauthorizedException('User not found');

    const memberships = await this.membershipRepo.findByUser(user.id);

    request.user = {
      id: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
      memberships: memberships.map((m) => m.toSnapshot()),
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
