import { ScopeRefProps } from './scope-ref';
import { Permission } from './permission';

export class UnknownRoleError extends Error {
  constructor(roleId: string) {
    super(`Unknown role '${roleId}'`);
    this.name = 'UnknownRoleError';
  }
}

export class NotAuthorizedToGrantError extends Error {
  constructor(scope: ScopeRefProps) {
    super(`Not authorized to grant roles in this scope (${scope.type})`);
    this.name = 'NotAuthorizedToGrantError';
  }
}

export class NotAuthorizedToRevokeError extends Error {
  constructor(scope: ScopeRefProps) {
    super(`Not authorized to revoke grants in this scope (${scope.type})`);
    this.name = 'NotAuthorizedToRevokeError';
  }
}

export class PrivilegeEscalationError extends Error {
  constructor(roleId: string, escalated: readonly Permission[]) {
    super(
      `Cannot grant role '${roleId}': it confers permissions you do not hold ` +
        `(${escalated.join(', ')})`,
    );
    this.name = 'PrivilegeEscalationError';
  }
}

export class GrantNotFoundError extends Error {
  constructor(id: string) {
    super(`Grant '${id}' not found`);
    this.name = 'GrantNotFoundError';
  }
}

export class NotAuthorizedToReadError extends Error {
  constructor(what: string) {
    super(`Not authorized to read ${what}`);
    this.name = 'NotAuthorizedToReadError';
  }
}

/**
 * Guards against an administrator revoking their own platform-admin grant and
 * locking themselves (and possibly the platform) out by accident.
 */
export class CannotRevokeOwnAdminError extends Error {
  constructor() {
    super(
      'You cannot revoke your own platform_admin grant; ask another admin to do it.',
    );
    this.name = 'CannotRevokeOwnAdminError';
  }
}

/**
 * Legacy-derived grants (`legacy:*`) are computed from `users.isAdmin` /
 * `memberships` at request time and are not rows in the grants table. They are
 * de-provisioned at their source, not through the grants API.
 */
export class LegacyGrantNotRevocableError extends Error {
  constructor(id: string) {
    super(
      `Grant '${id}' is legacy-derived and cannot be revoked here; ` +
        'remove it at its source (toggle isAdmin / delete the membership).',
    );
    this.name = 'LegacyGrantNotRevocableError';
  }
}

/** A grant `expiresAt` that is already in the past would create a dead grant. */
export class InvalidGrantExpiryError extends Error {
  constructor() {
    super('Grant expiry must be in the future.');
    this.name = 'InvalidGrantExpiryError';
  }
}
