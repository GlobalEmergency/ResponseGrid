import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServiceAccountPermissionGuard } from './service-account-permission.guard';
import { LocalAccessControl } from '../../domain/authorization/local-access-control';
import { RequestScopeResolver } from './scope-resolver';
import { Grant, GrantSnapshot } from '../../domain/authorization/grant';
import { ScopeRef } from '../../domain/authorization/scope-ref';
import type { AuthenticatedUser } from './jwt-auth.guard';

const SA = '22222222-2222-4222-8222-222222222222';
const E1 = '11111111-1111-4111-8111-111111111111';
const access = new LocalAccessControl();
const resolver = new RequestScopeResolver();

function grant(roleId: string, scope: ScopeRef): GrantSnapshot {
  return Grant.create({
    id: 'g1',
    principalId: SA,
    principalType: 'service_account',
    roleId,
    scope,
  }).toSnapshot();
}

function principal(
  isServiceAccount: boolean,
  grants: GrantSnapshot[],
): AuthenticatedUser {
  return {
    id: isServiceAccount ? SA : 'a-user',
    email: '',
    name: 'p',
    isAdmin: false,
    phone: null,
    memberships: [],
    grants,
    isServiceAccount,
  };
}

function contextFor(
  user: AuthenticatedUser | undefined,
  params: Record<string, string>,
): ExecutionContext {
  const request = { user, params };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

function guardFor(required: string | undefined): ServiceAccountPermissionGuard {
  const reflector = { get: () => required } as unknown as Reflector;
  return new ServiceAccountPermissionGuard(reflector, access, resolver);
}

describe('ServiceAccountPermissionGuard', () => {
  it('lets a human user through without any grant (open citizen-grade write)', async () => {
    const guard = guardFor('need:create');
    const ctx = contextFor(principal(false, []), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows a service account that holds the required permission at the scope', async () => {
    const guard = guardFor('need:create');
    const grants = [grant('integration_partner', ScopeRef.emergency(E1))];
    const ctx = contextFor(principal(true, grants), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('forbids a service account without the required grant', async () => {
    const guard = guardFor('need:create');
    const ctx = contextFor(principal(true, []), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('forbids a service account granted in a different emergency', async () => {
    const guard = guardFor('need:create');
    const grants = [grant('integration_partner', ScopeRef.emergency('other'))];
    const ctx = contextFor(principal(true, grants), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('forbids a service account whose role lacks the verb (e.g. need:validate)', async () => {
    const guard = guardFor('need:validate');
    const grants = [grant('integration_partner', ScopeRef.emergency(E1))];
    const ctx = contextFor(principal(true, grants), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('is a no-op for a service account when no permission is declared', async () => {
    const guard = guardFor(undefined);
    const ctx = contextFor(principal(true, []), { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    const guard = guardFor('need:create');
    const ctx = contextFor(undefined, { emergencyId: E1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
