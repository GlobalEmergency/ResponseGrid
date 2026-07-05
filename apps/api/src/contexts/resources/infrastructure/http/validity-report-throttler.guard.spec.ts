import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ValidityReportThrottlerGuard } from './validity-report-throttler.guard';

type IncrementResult = { isBlocked: boolean };

function contextFor(
  user: { id: string; grants: unknown[] } | undefined,
  ip = '1.2.3.4',
  headers: Record<string, string | string[] | undefined> = {},
): ExecutionContext {
  const req = { ip, user, headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function buildGuard(opts: {
  options?: unknown;
  canVerify?: boolean;
  blockedKeys?: string[];
}) {
  const hits: string[] = [];
  const storage = {
    increment: (key: string): Promise<IncrementResult> => {
      hits.push(key);
      return Promise.resolve({
        isBlocked: (opts.blockedKeys ?? []).includes(key),
      });
    },
  };
  const access = { can: () => Promise.resolve(opts.canVerify ?? false) };
  const scopeResolver = {
    resolve: () => Promise.resolve([{ type: 'platform' }]),
  };
  const guard = new ValidityReportThrottlerGuard(
    storage as never,
    (opts.options ?? [{ name: 'default', ttl: 1000, limit: 1 }]) as never,
    access as never,
    scopeResolver as never,
  );
  return { guard, hits };
}

const USER = { id: 'user-1', grants: [] };

describe('ValidityReportThrottlerGuard', () => {
  it('is a no-op when throttling is not configured (empty ruleset)', async () => {
    const { guard, hits } = buildGuard({ options: [] });
    await expect(guard.canActivate(contextFor(USER))).resolves.toBe(true);
    expect(hits).toEqual([]);
  });

  it('lets a trusted verifier through without touching the buckets', async () => {
    const { guard, hits } = buildGuard({ canVerify: true });
    await expect(guard.canActivate(contextFor(USER))).resolves.toBe(true);
    expect(hits).toEqual([]);
  });

  it('increments both the IP and the user bucket under the limit', async () => {
    const { guard, hits } = buildGuard({ canVerify: false });
    await expect(guard.canActivate(contextFor(USER))).resolves.toBe(true);
    expect(hits).toEqual([
      'validity-report:ip:1.2.3.4',
      'validity-report:user:user-1',
    ]);
  });

  it('keys the IP bucket by CF-Connecting-IP when the peer is a Cloudflare edge', async () => {
    const { guard, hits } = buildGuard({ canVerify: false });
    await expect(
      guard.canActivate(
        // peer 104.16.0.1 ∈ Cloudflare → the forwarded client IP is trusted.
        contextFor(USER, '104.16.0.1', { 'cf-connecting-ip': '203.0.113.9' }),
      ),
    ).resolves.toBe(true);
    expect(hits).toEqual([
      'validity-report:ip:203.0.113.9',
      'validity-report:user:user-1',
    ]);
  });

  it('ignores a forged CF-Connecting-IP on a direct (non-Cloudflare) hit', async () => {
    const { guard, hits } = buildGuard({ canVerify: false });
    await expect(
      guard.canActivate(
        contextFor(USER, '203.0.113.50', { 'cf-connecting-ip': '1.1.1.1' }),
      ),
    ).resolves.toBe(true);
    expect(hits).toEqual([
      'validity-report:ip:203.0.113.50',
      'validity-report:user:user-1',
    ]);
  });

  it('429s when the user bucket overflows even from a fresh IP', async () => {
    const { guard } = buildGuard({
      canVerify: false,
      blockedKeys: ['validity-report:user:user-1'],
    });
    await expect(
      guard.canActivate(contextFor(USER, '9.9.9.9')),
    ).rejects.toThrow(ThrottlerException);
  });

  it('429s when the IP bucket overflows', async () => {
    const { guard } = buildGuard({
      canVerify: false,
      blockedKeys: ['validity-report:ip:1.2.3.4'],
    });
    await expect(guard.canActivate(contextFor(USER))).rejects.toThrow(
      ThrottlerException,
    );
  });
});
