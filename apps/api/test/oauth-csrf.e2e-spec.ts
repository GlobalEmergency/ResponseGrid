/**
 * E2E tests for CSRF state protection on OAuth login endpoints.
 *
 * These tests exercise the OAuthInitiateGuard and OAuthCallbackGuard WITHOUT
 * real OAuth credentials. The strategies boot with placeholder clientIDs, so:
 *  - GET /auth/google → Passport issues a 302 redirect to accounts.google.com
 *    (we only care that the state cookie and query param are set).
 *  - GET /auth/google/callback?code=fake&state=WRONG → The callback guard
 *    rejects the request with `UnauthorizedException` before Passport attempts
 *    a token exchange. `OAuthController` catches ANY callback failure with
 *    `OAuthExceptionFilter` (#340) and turns it into a friendly `302` redirect
 *    to `${FRONTEND_URL}/login?error=oauth_failed` instead of a raw `401` —
 *    deliberate, browser-facing behavior. What still matters for CSRF safety
 *    is verified directly: the `rh_oauth_state` cookie is cleared/invalidated
 *    and no `accessToken`/session is produced.
 *
 * No DB seeding is needed because these endpoints do not touch the database
 * before the state check. The invalid-state path is rejected in the guard.
 */

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/contexts/resources/infrastructure/http/domain-exception.filter';

/** Matches the `OAuthExceptionFilter` / `OAuthController` fallback default. */
const FRONTEND_URL = 'http://localhost:3001';

/**
 * Safely extract the Set-Cookie response header as a string array.
 * `res.headers` is typed as `Record<string, unknown>` in supertest, so we
 * must narrow manually to avoid `no-unsafe-*` lint errors.
 */
function getSetCookies(res: { headers: Record<string, unknown> }): string[] {
  const raw: unknown = res.headers['set-cookie'];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string');
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
}

/**
 * Asserts that a rejected OAuth callback redirects the browser to the
 * frontend's friendly failure page — the `OAuthExceptionFilter` behavior
 * introduced by #340 — and never to the success path (which would carry an
 * `accessToken`).
 */
function expectOAuthFailureRedirect(res: {
  headers: Record<string, unknown>;
}): void {
  const location: unknown = res.headers['location'];
  const locationStr = typeof location === 'string' ? location : '';
  expect(locationStr).toBe(`${FRONTEND_URL}/login?error=oauth_failed`);
  expect(locationStr).not.toContain('/auth/complete#token=');
}

/**
 * Asserts that the `rh_oauth_state` CSRF cookie was invalidated in the
 * response — `res.clearCookie` re-issues it with an empty value and an
 * `Expires` date in the past — so a leaked/replayed state token cannot be
 * reused after a rejected callback.
 */
function expectStateCookieCleared(res: {
  headers: Record<string, unknown>;
}): void {
  const cookies = getSetCookies(res);
  const stateCookie = cookies.find((c) => c.startsWith('rh_oauth_state='));

  expect(stateCookie).toBeDefined();
  expect(stateCookie).toMatch(/^rh_oauth_state=;/);
  expect(stateCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
}

describe('OAuth CSRF state protection (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Google initiate ───────────────────────────────────────────────────────

  describe('GET /auth/google (initiate)', () => {
    it('returns 302 and Location contains state=', async () => {
      const res = await request(server).get('/auth/google').redirects(0);

      expect(res.status).toBe(302);
      const location: unknown = res.headers['location'];
      expect(typeof location === 'string' ? location : '').toMatch(
        /[?&]state=/,
      );
    });

    it('sets the rh_oauth_state httpOnly cookie', async () => {
      const res = await request(server).get('/auth/google').redirects(0);

      const cookies = getSetCookies(res);
      const stateCookie = cookies.find((c) => c.startsWith('rh_oauth_state='));

      expect(stateCookie).toBeDefined();
      expect(stateCookie).toMatch(/HttpOnly/i);
    });
  });

  // ─── Google callback — invalid state ──────────────────────────────────────

  describe('GET /auth/google/callback (invalid state)', () => {
    it('redirects to /login?error=oauth_failed when query state does not match cookie', async () => {
      const res = await request(server)
        .get('/auth/google/callback?code=fake&state=WRONG')
        .set('Cookie', 'rh_oauth_state=ORIGINAL')
        .redirects(0);

      expect(res.status).toBe(302);
      expectOAuthFailureRedirect(res);
      expectStateCookieCleared(res);
    });

    it('redirects to /login?error=oauth_failed when state cookie is missing', async () => {
      const res = await request(server)
        .get('/auth/google/callback?code=fake&state=some-state')
        .redirects(0);

      expect(res.status).toBe(302);
      expectOAuthFailureRedirect(res);
      expectStateCookieCleared(res);
    });

    it('redirects to /login?error=oauth_failed when query state is missing', async () => {
      const res = await request(server)
        .get('/auth/google/callback?code=fake')
        .set('Cookie', 'rh_oauth_state=some-state')
        .redirects(0);

      expect(res.status).toBe(302);
      expectOAuthFailureRedirect(res);
      expectStateCookieCleared(res);
    });

    it('does not redirect to /auth/complete on invalid state', async () => {
      const res = await request(server)
        .get('/auth/google/callback?code=fake&state=WRONG')
        .set('Cookie', 'rh_oauth_state=ORIGINAL')
        .redirects(0);

      const location: unknown = res.headers['location'];
      const locationStr = typeof location === 'string' ? location : '';
      expect(locationStr).not.toContain('/auth/complete#token=');
    });

    it('clears the state cookie even on rejection', async () => {
      const res = await request(server)
        .get('/auth/google/callback?code=fake&state=WRONG')
        .set('Cookie', 'rh_oauth_state=ORIGINAL')
        .redirects(0);

      // Rejected callbacks are redirected (never a raw success response), and
      // the state cookie must be invalidated so it cannot be replayed.
      expect(res.status).toBe(302);
      expectStateCookieCleared(res);
    });
  });

  // ─── Facebook initiate ────────────────────────────────────────────────────

  describe('GET /auth/facebook (initiate)', () => {
    it('returns 302 and Location contains state=', async () => {
      const res = await request(server).get('/auth/facebook').redirects(0);

      expect(res.status).toBe(302);
      const location: unknown = res.headers['location'];
      expect(typeof location === 'string' ? location : '').toMatch(
        /[?&]state=/,
      );
    });

    it('sets the rh_oauth_state httpOnly cookie', async () => {
      const res = await request(server).get('/auth/facebook').redirects(0);

      const cookies = getSetCookies(res);
      const stateCookie = cookies.find((c) => c.startsWith('rh_oauth_state='));

      expect(stateCookie).toBeDefined();
      expect(stateCookie).toMatch(/HttpOnly/i);
    });
  });

  // ─── Facebook callback — invalid state ────────────────────────────────────

  describe('GET /auth/facebook/callback (invalid state)', () => {
    it('redirects to /login?error=oauth_failed when query state does not match cookie', async () => {
      const res = await request(server)
        .get('/auth/facebook/callback?code=fake&state=WRONG')
        .set('Cookie', 'rh_oauth_state=ORIGINAL')
        .redirects(0);

      expect(res.status).toBe(302);
      expectOAuthFailureRedirect(res);
      expectStateCookieCleared(res);
    });

    it('redirects to /login?error=oauth_failed when state cookie is missing', async () => {
      const res = await request(server)
        .get('/auth/facebook/callback?code=fake&state=some-state')
        .redirects(0);

      expect(res.status).toBe(302);
      expectOAuthFailureRedirect(res);
      expectStateCookieCleared(res);
    });
  });
});
