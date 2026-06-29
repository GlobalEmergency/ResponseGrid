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
    originalUrl: '/resources?city=Caracas',
    ip: '203.0.113.7',
    get: (name: string) =>
      name.toLowerCase() === 'user-agent' ? 'curl/8.0' : undefined,
    ...overrides,
  } as unknown as Request;
}

function fakeRes(statusCode: number): { res: Response; finish: () => void } {
  let handler: FinishHandler = () => undefined;
  const res = {
    statusCode,
    on: (event: string, cb: FinishHandler) => {
      if (event === 'finish') handler = cb;
    },
    get: () => '128',
  } as unknown as Response;
  return { res, finish: () => handler() };
}

function captureLine(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const spy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    });
  return { lines, restore: () => spy.mockRestore() };
}

describe('httpLogger', () => {
  it('emits a Datadog-standard JSON line once the response finishes', () => {
    const { lines, restore } = captureLine();
    const next = jest.fn() as unknown as NextFunction;
    const { res, finish } = fakeRes(200);

    httpLogger(fakeReq(), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(lines).toHaveLength(0); // nothing until 'finish'

    finish();
    restore();

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(entry).toMatchObject({
      status: 'info',
      http: {
        method: 'GET',
        status_code: 200,
        url: '/resources?city=Caracas',
        useragent: 'curl/8.0',
      },
      network: { client: { ip: '203.0.113.7' }, bytes_written: 128 },
    });
    expect(typeof entry.duration).toBe('number'); // nanoseconds
  });

  it('maps 4xx to warn and 5xx to error in `status`', () => {
    const { lines, restore } = captureLine();
    const next = jest.fn() as unknown as NextFunction;

    const a = fakeRes(404);
    httpLogger(fakeReq(), a.res, next);
    a.finish();

    const b = fakeRes(500);
    httpLogger(fakeReq(), b.res, next);
    b.finish();
    restore();

    expect((JSON.parse(lines[0]) as { status: string }).status).toBe('warn');
    expect((JSON.parse(lines[1]) as { status: string }).status).toBe('error');
  });

  it('skips binary/noise prefixes without emitting a line', () => {
    const { lines, restore } = captureLine();
    const next = jest.fn() as unknown as NextFunction;
    const { res, finish } = fakeRes(200);

    httpLogger(fakeReq({ path: '/files/abc.jpg' }), res, next);
    finish();
    restore();

    expect(next).toHaveBeenCalledTimes(1);
    expect(lines).toHaveLength(0);
  });
});
