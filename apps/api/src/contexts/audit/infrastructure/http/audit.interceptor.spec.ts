import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { InMemoryAuditRepository } from '../in-memory-audit.repository';
import type { AuditMutationContext } from './audit-context';

interface FakeReq {
  method: string;
  path: string;
  route?: { path: string };
  params?: Record<string, string>;
  user?: { id: string; name: string };
  auditContext?: AuditMutationContext;
}

function ctx(req: FakeReq, res: { statusCode: number }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of(undefined) };

function run(
  interceptor: AuditInterceptor,
  req: FakeReq,
  res: { statusCode: number },
): Promise<void> {
  return new Promise((resolve) => {
    interceptor
      .intercept(ctx(req, res), next)
      .subscribe({ complete: () => resolve() });
  });
}

describe('AuditInterceptor', () => {
  it('enriches the audit entry with the controller-supplied reason, changes, target state and emergency', async () => {
    const repo = new InMemoryAuditRepository();
    const interceptor = new AuditInterceptor(repo);

    await run(
      interceptor,
      {
        method: 'POST',
        path: '/needs/n1/discard',
        route: { path: '/needs/:needId/discard' },
        params: { needId: 'n1' },
        user: { id: 'u1', name: 'Coordinadora Ana' },
        auditContext: {
          reason: 'Petición duplicada',
          changes: [{ field: 'status', before: 'pending', after: 'rejected' }],
          targetStatus: 'rejected',
          emergencyId: 'em1',
        },
      },
      { statusCode: 204 },
    );

    const [entry] = repo.all();
    expect(entry.action).toBe('need.discard');
    expect(entry.entityType).toBe('need');
    expect(entry.entityId).toBe('n1');
    expect(entry.emergencyId).toBe('em1');
    expect(entry.actorUserId).toBe('u1');
    // actorName falls back to the authenticated user's name when not supplied
    expect(entry.actorName).toBe('Coordinadora Ana');
    expect(entry.reason).toBe('Petición duplicada');
    expect(entry.targetStatus).toBe('rejected');
    expect(entry.changes).toEqual([
      { field: 'status', before: 'pending', after: 'rejected' },
    ]);
  });

  it('records a plain mutation (no enrichment) with null traceability fields', async () => {
    const repo = new InMemoryAuditRepository();
    const interceptor = new AuditInterceptor(repo);

    await run(
      interceptor,
      {
        method: 'POST',
        path: '/resources/r1/verify',
        route: { path: '/resources/:resourceId/verify' },
        params: { resourceId: 'r1' },
        user: { id: 'u2', name: 'Bob' },
      },
      { statusCode: 204 },
    );

    const [entry] = repo.all();
    expect(entry.action).toBe('resource.verify');
    expect(entry.reason).toBeNull();
    expect(entry.changes).toBeNull();
    expect(entry.targetStatus).toBeNull();
  });

  it('does not audit reads, failed responses, or the audit endpoint itself', async () => {
    const repo = new InMemoryAuditRepository();
    const interceptor = new AuditInterceptor(repo);

    await run(
      interceptor,
      { method: 'GET', path: '/needs', params: {} },
      { statusCode: 200 },
    );
    await run(
      interceptor,
      {
        method: 'POST',
        path: '/needs/n1/discard',
        route: { path: '/needs/:needId/discard' },
        params: { needId: 'n1' },
      },
      { statusCode: 409 },
    );
    await run(
      interceptor,
      { method: 'GET', path: '/emergencies/em1/audit', params: {} },
      { statusCode: 200 },
    );

    expect(repo.all()).toHaveLength(0);
  });
});
