import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { LocalAccessControl } from '../../domain/authorization/local-access-control';
import { RequestScopeResolver } from './scope-resolver';
import { deriveGrantsFromLegacy } from '../../domain/authorization/legacy-grant-mapping';
import { Role } from '../../domain/role';
import type { AuthenticatedUser } from './jwt-auth.guard';
import type { MembershipSnapshot } from '../../domain/membership';

const USER = '11111111-1111-4111-8111-111111111111';
const access = new LocalAccessControl();
const resolver = new RequestScopeResolver();

function userWith(
  isAdmin: boolean,
  memberships: MembershipSnapshot[],
): AuthenticatedUser {
  return {
    id: USER,
    email: 'u@reliefhub.test',
    name: 'U',
    isAdmin,
    memberships,
    grants: deriveGrantsFromLegacy(USER, isAdmin, memberships),
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

function guardFor(required: string | undefined): PermissionGuard {
  const reflector = { get: () => required } as unknown as Reflector;
  return new PermissionGuard(reflector, access, resolver);
}

const coordinatorOfE1: MembershipSnapshot[] = [
  { id: 'm1', userId: USER, emergencyId: 'e1', role: Role.Coordinator },
];

describe('PermissionGuard', () => {
  it('allows a coordinator to verify a resource in their emergency', async () => {
    const guard = guardFor('resource:verify');
    const ctx = contextFor(userWith(false, coordinatorOfE1), {
      emergencyId: 'e1',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('forbids a coordinator in a different emergency', async () => {
    const guard = guardFor('resource:verify');
    const ctx = contextFor(userWith(false, coordinatorOfE1), {
      emergencyId: 'e2',
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows a platform admin anywhere', async () => {
    const guard = guardFor('accreditation:grant');
    const ctx = contextFor(userWith(true, []), {});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('is a no-op when the handler declares no permission', async () => {
    const guard = guardFor(undefined);
    const ctx = contextFor(undefined, {});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects an unauthenticated request when a permission is required', async () => {
    const guard = guardFor('resource:read');
    const ctx = contextFor(undefined, { emergencyId: 'e1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
