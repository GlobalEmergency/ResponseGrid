import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

/**
 * Authenticates a request via EITHER an `X-API-Key` header (service account) OR
 * a `Bearer` JWT (human user), populating `request.user` in the single
 * {@link AuthenticatedUser} shape. Lets the citizen-grade write endpoints
 * (create need / offer / resource) accept a trusted integration's API key as
 * well as a logged-in user — the integration then carries the real person in
 * the `author` block instead of forcing them to register (issue #235).
 *
 * The header decides the mechanism: if `X-API-Key` is present we delegate to
 * {@link ApiKeyAuthGuard}, otherwise to {@link JwtAuthGuard}. Each delegate
 * throws its own UnauthorizedException on failure, so a malformed key is never
 * silently retried as a (missing) JWT.
 */
@Injectable()
export class JwtOrApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const hasApiKey = request.headers['x-api-key'] !== undefined;
    return hasApiKey
      ? this.apiKeyGuard.canActivate(context)
      : this.jwtGuard.canActivate(context);
  }
}
