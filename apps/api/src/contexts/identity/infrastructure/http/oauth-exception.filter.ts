import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OAUTH_NEXT_COOKIE, sanitizeNextPath } from './oauth-next';
import { readCookie } from './oauth-state.guard';
import { UnverifiedProviderEmailError } from '../../domain/unverified-provider-email.error';
import { AccountLinkRequiresAuthError } from '../../domain/account-link-requires-auth.error';

/**
 * Turns ANY failure during the browser-based OAuth flow into a friendly redirect
 * back to the frontend `/login?error=<code>` instead of a raw 500/JSON — the
 * user is a browser mid-login, not an API client. Known domain errors
 * (email already claimed by another account) map to `account_exists`; anything
 * else (CSRF state mismatch, token exchange failure, provider error) maps to
 * `oauth_failed`. The `next` return-path cookie is preserved so the login page
 * can send the user onward after they resolve it.
 */
@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name);
  private readonly frontendUrl =
    process.env.FRONTEND_URL ?? 'http://localhost:3001';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const next = sanitizeNextPath(readCookie(req, OAUTH_NEXT_COOKIE));
    res.clearCookie(OAUTH_NEXT_COOKIE, { path: '/auth' });
    const nextParam = next ? `&next=${encodeURIComponent(next)}` : '';

    const code =
      exception instanceof UnverifiedProviderEmailError ||
      exception instanceof AccountLinkRequiresAuthError
        ? 'account_exists'
        : 'oauth_failed';

    const message =
      exception instanceof Error ? exception.message : String(exception);
    this.logger.warn(`OAuth login failed (${code}): ${message}`);

    res.redirect(`${this.frontendUrl}/login?error=${code}${nextParam}`);
  }
}
