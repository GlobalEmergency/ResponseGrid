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
