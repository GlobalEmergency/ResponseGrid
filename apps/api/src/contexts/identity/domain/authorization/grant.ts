import { ScopeRef, ScopeRefProps } from './scope-ref';

export type PrincipalType = 'user' | 'service_account';

/**
 * Serializable form of a {@link Grant}. Dates are ISO-8601 strings so a grant
 * can travel inside a JWT (see docs/features/13 §9, decision D3) and survive
 * JSON round-trips.
 */
export interface GrantSnapshot {
  id: string;
  principalId: string;
  principalType: PrincipalType;
  roleId: string;
  scope: ScopeRefProps;
  grantedByPrincipalId: string | null;
  grantedAt: string;
  expiresAt: string | null;
}

/**
 * A grant is the triple `(principal, role, scope)` — the single polymorphic
 * concession that generalizes the legacy `memberships`, `organization_members`
 * and the `isAdmin` boolean into one concept. See docs/features/13 §3.
 */
export class Grant {
  private constructor(
    public readonly id: string,
    public readonly principalId: string,
    public readonly principalType: PrincipalType,
    public readonly roleId: string,
    public readonly scope: ScopeRef,
    public readonly grantedByPrincipalId: string | null,
    public readonly grantedAt: Date,
    public readonly expiresAt: Date | null,
  ) {}

  static create(props: {
    id: string;
    principalId: string;
    principalType?: PrincipalType;
    roleId: string;
    scope: ScopeRef;
    grantedByPrincipalId?: string | null;
    grantedAt?: Date;
    expiresAt?: Date | null;
  }): Grant {
    return new Grant(
      props.id,
      props.principalId,
      props.principalType ?? 'user',
      props.roleId,
      props.scope,
      props.grantedByPrincipalId ?? null,
      props.grantedAt ?? new Date(),
      props.expiresAt ?? null,
    );
  }

  static fromSnapshot(s: GrantSnapshot): Grant {
    return new Grant(
      s.id,
      s.principalId,
      s.principalType,
      s.roleId,
      ScopeRef.fromProps(s.scope),
      s.grantedByPrincipalId,
      new Date(s.grantedAt),
      s.expiresAt === null ? null : new Date(s.expiresAt),
    );
  }

  toSnapshot(): GrantSnapshot {
    return {
      id: this.id,
      principalId: this.principalId,
      principalType: this.principalType,
      roleId: this.roleId,
      scope: this.scope.toPlain(),
      grantedByPrincipalId: this.grantedByPrincipalId,
      grantedAt: this.grantedAt.toISOString(),
      expiresAt: this.expiresAt === null ? null : this.expiresAt.toISOString(),
    };
  }

  /** A grant with no `expiresAt`, or whose expiry is still in the future. */
  isActive(now: Date): boolean {
    return this.expiresAt === null || this.expiresAt.getTime() > now.getTime();
  }
}
