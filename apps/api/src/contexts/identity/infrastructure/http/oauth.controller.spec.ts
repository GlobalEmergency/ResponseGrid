import type { Request, Response } from 'express';
import { OAuthController } from './oauth.controller';
import { OAUTH_NEXT_COOKIE } from './oauth-next';

const FRONTEND = 'https://web.test';

function resMock() {
  const calls = { redirect: [] as string[], cleared: [] as string[] };
  const res = {
    redirect: (url: string): void => {
      calls.redirect.push(url);
    },
    clearCookie: (name: string): void => {
      calls.cleared.push(name);
    },
  } as unknown as Response;
  return { res, calls };
}

function reqMock(opts: {
  accessToken?: string;
  cookieHeader?: string;
}): Request {
  return {
    user: opts.accessToken ? { accessToken: opts.accessToken } : undefined,
    headers: { cookie: opts.cookieHeader },
    query: {},
  } as unknown as Request;
}

describe('OAuthController', () => {
  let savedFrontend: string | undefined;

  beforeAll(() => {
    savedFrontend = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = FRONTEND;
  });

  afterAll(() => {
    if (savedFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = savedFrontend;
  });

  it('redirects to /auth/complete with just the token when there is no next cookie', () => {
    const { res, calls } = resMock();
    new OAuthController().googleCallback(
      reqMock({ accessToken: 'jwt123' }),
      res,
    );

    expect(calls.redirect).toEqual([`${FRONTEND}/auth/complete#token=jwt123`]);
    expect(calls.cleared).toContain(OAUTH_NEXT_COOKIE);
  });

  it('appends the sanitized return path from the next cookie', () => {
    const { res, calls } = resMock();
    new OAuthController().googleCallback(
      reqMock({
        accessToken: 'jwt123',
        // Express URL-encodes cookie values; the controller must decode + re-encode.
        cookieHeader: `${OAUTH_NEXT_COOKIE}=%2Fgrupos`,
      }),
      res,
    );

    expect(calls.redirect).toEqual([
      `${FRONTEND}/auth/complete#token=jwt123&next=%2Fgrupos`,
    ]);
  });

  it('drops an open-redirect next and lands on the app root', () => {
    const { res, calls } = resMock();
    new OAuthController().facebookCallback(
      reqMock({
        accessToken: 'jwt123',
        cookieHeader: `${OAUTH_NEXT_COOKIE}=https%3A%2F%2Fevil.com`,
      }),
      res,
    );

    expect(calls.redirect).toEqual([`${FRONTEND}/auth/complete#token=jwt123`]);
  });

  it('redirects to /login on a missing token, preserving next for the retry', () => {
    const { res, calls } = resMock();
    new OAuthController().googleCallback(
      reqMock({ cookieHeader: `${OAUTH_NEXT_COOKIE}=%2Fgrupos` }),
      res,
    );

    expect(calls.redirect).toEqual([
      `${FRONTEND}/login?error=oauth_failed&next=%2Fgrupos`,
    ]);
    expect(calls.cleared).toContain(OAUTH_NEXT_COOKIE);
  });
});
