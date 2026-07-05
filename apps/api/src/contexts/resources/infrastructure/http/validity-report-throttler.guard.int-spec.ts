import {
  CanActivate,
  Controller,
  ExecutionContext,
  HttpCode,
  Injectable,
  Post,
  UseGuards,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { ACCESS_CONTROL } from '../../../identity/domain/authorization/access-control';
import { SCOPE_RESOLVER } from '../../../identity/infrastructure/http/scope-resolver';
import { ValidityReportThrottlerGuard } from './validity-report-throttler.guard';

/**
 * Integration test: proves the guard is actually wired and executed by Nest's
 * DI when referenced by class in `@UseGuards` — even though it is NOT listed in
 * the module `providers` (Nest auto-registers `@UseGuards` classes as module
 * injectables). Guards the endpoint against the "silently dropped guard"
 * failure mode and exercises the real IP/user buckets + bypass end-to-end.
 */
@Injectable()
class SeedUserGuard implements CanActivate {
  static userId = 'user-int';
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { id: string; grants: unknown[] } }>();
    req.user = { id: SeedUserGuard.userId, grants: [] };
    return true;
  }
}

@Controller()
class ProbeController {
  @Post('resources/:resourceId/validity-reports')
  @HttpCode(201)
  @UseGuards(SeedUserGuard, ValidityReportThrottlerGuard)
  report(): { ok: true } {
    return { ok: true };
  }
}

describe('ValidityReportThrottlerGuard (integration / DI wiring)', () => {
  let app: INestApplication;
  let server: Server;
  let canVerify = false;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        // Non-empty ruleset so the guard does NOT take its test-env no-op path.
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 3_600_000, limit: 999 },
        ]),
      ],
      controllers: [ProbeController],
      providers: [
        // Deliberately do NOT register ValidityReportThrottlerGuard here — the
        // test asserts Nest still resolves and runs it from @UseGuards metadata.
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
        {
          provide: ACCESS_CONTROL,
          useValue: { can: () => Promise.resolve(canVerify) },
        },
        {
          provide: SCOPE_RESOLVER,
          useValue: { resolve: () => Promise.resolve([{ type: 'platform' }]) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  const hit = () =>
    request(server).post('/resources/r-1/validity-reports').send({});

  it('runs the guard: caps a non-verifier at 20/hour with a real 429', async () => {
    canVerify = false;
    SeedUserGuard.userId = 'user-capped';
    for (let i = 0; i < 20; i++) {
      await hit().expect(201);
    }
    // 21st request trips either the per-IP or per-user bucket.
    await hit().expect(429);
  });

  it('bypasses the limit entirely for a trusted verifier', async () => {
    canVerify = true;
    SeedUserGuard.userId = 'user-verifier';
    for (let i = 0; i < 25; i++) {
      await hit().expect(201);
    }
  });
});
