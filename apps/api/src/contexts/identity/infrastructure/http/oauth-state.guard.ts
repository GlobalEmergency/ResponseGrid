import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  mixin,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { OAUTH_NEXT_COOKIE, sanitizeNextPath } from './oauth-next';

/** Name of the cookie that carries the CSRF state token. */
const STATE_COOKIE = 'rh_oauth_state';
/** TTL for the state cookie: 10 minutes in milliseconds. */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Extracts the value of a single cookie from a raw `Cookie` header string.
 * Used as a fallback when `cookie-parser` middleware is NOT registered
 * (i.e. `req.cookies` is absent).
 */
function parseCookieHeader(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return undefined;
}

/**
 * Best-effort percent-decode. Express' `res.cookie` URL-encodes values, so the
 * manual header parser must decode them back. Malformed sequences (rare) fall
 * through to the raw value instead of throwing.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Reads a cookie from the request by name.
 * Prefers `req.cookies` (cookie-parser, already decoded) but falls back to
 * manual header parsing — this project does NOT register cookie-parser
 * middleware — decoding the raw value to undo Express' `res.cookie` encoding.
 */
export function readCookie(req: Request, name: string): string | undefined {
  // Express types `req.cookies` as `any` (cookie-parser may or may not be
  // registered). We go through `unknown` to satisfy `no-unsafe-*` lint rules.
  const cookieJar: unknown = (req as Request & { cookies?: unknown }).cookies;
  if (cookieJar !== null && typeof cookieJar === 'object') {
    const raw: unknown = (cookieJar as Record<string, unknown>)[name];
    if (typeof raw === 'string') {
      return raw;
    }
  }
  const fromHeader = parseCookieHeader(req.headers.cookie, name);
  return fromHeader === undefined ? undefined : safeDecode(fromHeader);
}

/**
 * Factory that creates `OAuthInitiateGuard` for the given passport provider.
 *
 * Extends `AuthGuard(provider)` and overrides `getAuthenticateOptions` to:
 *  1. Generate a `randomUUID()` CSRF state token.
 *  2. Set it as an httpOnly cookie on the response.
 *  3. Return `{ state }` so Passport forwards it to the OAuth provider.
 */
export function OAuthInitiateGuard(
  provider: 'google' | 'facebook',
): new () => CanActivate {
  class MixinOAuthInitiateGuard extends AuthGuard(provider) {
    override getAuthenticateOptions(context: ExecutionContext): object {
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();
      const state = randomUUID();

      const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/auth',
        maxAge: STATE_MAX_AGE_MS,
        // Secure by default in production (fail-safe); an HTTPS-terminating-
        // upstream deployment serving plain HTTP can opt out with
        // COOKIE_SECURE=false. Off outside production for local/proxy runs.
        secure:
          process.env.NODE_ENV === 'production' &&
          process.env.COOKIE_SECURE !== 'false',
      };

      res.cookie(STATE_COOKIE, state, cookieOptions);

      // Stash the post-login return path so the callback can send the user back
      // to the page that triggered the login. Cleared when absent or unsafe so a
      // previous attempt's target can never leak into this one.
      const next = sanitizeNextPath(req.query['next']);
      if (next === undefined) {
        res.clearCookie(OAUTH_NEXT_COOKIE, { path: '/auth' });
      } else {
        res.cookie(OAUTH_NEXT_COOKIE, next, cookieOptions);
      }

      return { state };
    }
  }

  return mixin(MixinOAuthInitiateGuard);
}

/**
 * Factory that creates `OAuthCallbackGuard` for the given passport provider.
 *
 * Extends `AuthGuard(provider)` and overrides `canActivate` to:
 *  1. Read `state` from `req.query` and the CSRF cookie from the request.
 *  2. **Always** clear the state cookie (prevent replay regardless of outcome).
 *  3. Throw `UnauthorizedException` if either value is missing or they differ.
 *  4. Delegate to `super.canActivate(context)` (Passport token exchange) only
 *     when the state is valid.
 */
export function OAuthCallbackGuard(
  provider: 'google' | 'facebook',
): new () => CanActivate {
  class MixinOAuthCallbackGuard extends AuthGuard(provider) {
    override async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();

      // Always clear the cookie to prevent replay attacks.
      res.clearCookie(STATE_COOKIE, { path: '/auth' });

      // Narrow req.query.state from unknown to string | undefined.
      const queryState: unknown = req.query['state'];
      const stateFromQuery: string | undefined =
        typeof queryState === 'string' ? queryState : undefined;

      const stateFromCookie = readCookie(req, STATE_COOKIE);

      if (
        !stateFromQuery ||
        !stateFromCookie ||
        stateFromQuery !== stateFromCookie
      ) {
        throw new UnauthorizedException('Invalid OAuth state');
      }

      // Delegate to Passport for the actual token exchange.
      return super.canActivate(context) as Promise<boolean>;
    }
  }

  return mixin(MixinOAuthCallbackGuard);
}
