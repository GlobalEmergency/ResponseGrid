import { Test } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  PATH_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
} from '@nestjs/common/constants';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
} from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { REQUIRED_PERMISSION } from '../src/contexts/identity/infrastructure/http/require-permission.decorator';

/**
 * Authorization safety net.
 *
 * Walks EVERY controller mounted by AppModule and asserts that every mutating
 * endpoint (POST/PUT/PATCH/DELETE) is protected — i.e. it either carries an
 * authenticating guard, or is explicitly listed as an intentionally-public
 * endpoint below. A new write endpoint that forgets its guard fails CI instead
 * of shipping an unauthenticated mutation.
 *
 * It also asserts that any route using PermissionGuard declares a
 * @RequirePermission — a PermissionGuard with no required permission is a
 * misconfiguration that would silently authorize everyone.
 *
 * This is metadata introspection (no HTTP calls), so it is fast and covers new
 * controllers automatically.
 */

// Guards that actually authenticate the request (establish req.user). Note:
// - OptionalJwtAuthGuard does NOT (it allows anonymous) → not listed.
// - PermissionGuard / ServiceAccountPermissionGuard authorize but assume a
//   preceding authenticating guard, so they don't count on their own.
const AUTHENTICATING_GUARDS = new Set<string>([
  'JwtAuthGuard',
  'JwtOrApiKeyAuthGuard',
  'ApiKeyAuthGuard',
  'RequireAdminGuard',
]);

const MUTATING_METHODS = new Set<RequestMethod>([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
]);

/**
 * Intentionally public (unauthenticated) mutating endpoints. Each MUST be
 * justified — adding to this set is the deliberate way to allow a public write.
 * Keyed by `ControllerClassName#handlerMethod`.
 */
const PUBLIC_MUTATING = new Set<string>([
  // Public sign-in / sign-up (per-IP throttled).
  'AuthController#loginRoute',
  'AuthController#registerRoute',
  // Donation intake is a citizen-facing public flow (throttled): a donor
  // pre-registers a donation, is recognised by contact, and edits their own
  // pending intake by proving possession of the code + contact.
  'DonationIntakesController#create',
  'DonationIntakesController#lookupContact',
  'DonationIntakesController#update',
]);

const METHOD_LABEL: Record<number, string> = {
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.DELETE]: 'DELETE',
};

function guardNamesOf(target: object): string[] {
  const guards =
    (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ??
    [];
  return guards.map((g) =>
    typeof g === 'function'
      ? g.name
      : ((g as { constructor?: { name?: string } })?.constructor?.name ?? ''),
  );
}

describe('Authorization coverage — every mutating endpoint is guarded', () => {
  const unguarded: string[] = [];
  const permissionGuardWithoutDecorator: string[] = [];
  let mutatingEndpointsChecked = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    }).compile();

    const discovery = moduleRef.get(DiscoveryService);
    const scanner = new MetadataScanner();

    for (const wrapper of discovery.getControllers()) {
      const metatype = wrapper.metatype;
      const instance = wrapper.instance as object | undefined;
      if (!metatype || !instance) continue;

      const prototype = Object.getPrototypeOf(instance) as object;
      const classGuards = guardNamesOf(metatype);

      for (const methodName of scanner.getAllMethodNames(prototype)) {
        const handler = (prototype as Record<string, unknown>)[methodName];
        const httpMethod = Reflect.getMetadata(
          METHOD_METADATA,
          handler as object,
        ) as RequestMethod | undefined;
        if (httpMethod === undefined || !MUTATING_METHODS.has(httpMethod)) {
          continue;
        }
        mutatingEndpointsChecked++;

        const key = `${metatype.name}#${methodName}`;
        const guards = [...guardNamesOf(handler), ...classGuards];
        const path = Reflect.getMetadata(PATH_METADATA, handler as object) as
          | string
          | undefined;
        const label = `${METHOD_LABEL[httpMethod]} ${path ?? ''} (${key})`;

        const hasAuth = guards.some((g) => AUTHENTICATING_GUARDS.has(g));
        if (!hasAuth && !PUBLIC_MUTATING.has(key)) {
          unguarded.push(label);
        }

        // @RequirePermission may be declared on the handler OR on the
        // controller class (class-level applies to every route).
        const requiredPermission =
          (Reflect.getMetadata(REQUIRED_PERMISSION, handler as object) as
            | string
            | undefined) ??
          (Reflect.getMetadata(REQUIRED_PERMISSION, metatype) as
            | string
            | undefined);
        if (
          guards.includes('PermissionGuard') &&
          requiredPermission === undefined
        ) {
          permissionGuardWithoutDecorator.push(label);
        }
      }
    }

    await moduleRef.close();
  });

  it('actually discovered the controllers (guards against a vacuous pass)', () => {
    // There are well over 15 mutating handlers across the contexts; if discovery
    // silently returns nothing this catches it instead of passing vacuously.
    expect(mutatingEndpointsChecked).toBeGreaterThan(15);
  });

  it('all mutating endpoints carry an authenticating guard or are explicitly public', () => {
    expect(unguarded).toEqual([]);
  });

  it('every PermissionGuard route declares a @RequirePermission', () => {
    expect(permissionGuardWithoutDecorator).toEqual([]);
  });
});
