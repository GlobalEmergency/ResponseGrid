import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// Avoid loading the real dd-trace in unit tests; no active span here.
jest.mock('dd-trace', () => ({
  __esModule: true,
  default: { scope: () => ({ active: () => null }) },
}));

import { httpLogger } from './http-logger.middleware';

type FinishHandler = () => void;

function fakeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/resources',
    ip: '203.0.113.7',
    get: (name: string) =>
      name.toLowerCase() === 'user-agent' ? 'curl/8.0' : undefined,
    ...overrides,
  } as unknown as Request;
}

function fakeRes(statusCode: number): {
  res: Response;
  finish: () => void;
} {
  let handler: FinishHandler = () => undefined;
  const res = {
    statusCode,
    on: (event: string, cb: FinishHandler) => {
      if (event === 'finish') handler = cb;
    },
    get: () => undefined,
  } as unknown as Response;
  return { res, finish: () => handler() };
}

describe('httpLogger', () => {
  it('logs one line with request metadata once the response finishes', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const next = jest.fn() as unknown as NextFunction;
    const { res, finish } = fakeRes(200);

    httpLogger(fakeReq(), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled(); // nothing logged until 'finish'

    finish();

    expect(log).toHaveBeenCalledTimes(1);
    const payload = log.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      method: 'GET',
      path: '/resources',
      statusCode: 200,
      ip: '203.0.113.7',
      userAgent: 'curl/8.0',
    });
    expect(typeof payload.durationMs).toBe('number');

    log.mockRestore();
  });

  it('routes 4xx to warn and 5xx to error', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const next = jest.fn() as unknown as NextFunction;

    const a = fakeRes(404);
    httpLogger(fakeReq(), a.res, next);
    a.finish();

    const b = fakeRes(500);
    httpLogger(fakeReq(), b.res, next);
    b.finish();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);

    warn.mockRestore();
    error.mockRestore();
  });

  it('skips binary/noise prefixes without logging', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const next = jest.fn() as unknown as NextFunction;
    const { res, finish } = fakeRes(200);

    httpLogger(fakeReq({ path: '/files/abc.jpg' }), res, next);
    finish();

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();

    log.mockRestore();
  });
});
