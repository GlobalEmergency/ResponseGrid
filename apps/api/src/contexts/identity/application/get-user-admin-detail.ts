import { UserAdminRepository } from '../domain/ports/user-admin.repository';
import { GrantRepository } from '../domain/ports/grant.repository';
import { OrganizationReader } from '../domain/ports/organization-reader';
import { UserActivityReader } from '../domain/ports/user-activity-reader';
import { ScopeNameReader } from '../domain/ports/scope-name-reader';
import { GrantSnapshot } from '../domain/authorization/grant';
import { UserNotFoundError } from '../domain/user-not-found.error';
import { UserAdminDetail, UserGrantView } from './user-admin-view';

export interface GetUserAdminDetailQuery {
  userId: string;
}

/** How many recent activity rows the detail surfaces. */
const ACTIVITY_LIMIT = 20;

/**
 * Admin detail of a single user: core fields + their grants (roles by scope,
 * with resolved scope names) + the organizations they belong to + recent
 * activity from the audit trail. Reuses the existing grant repository and the
 * organization/activity/scope-name reader ports (DIP); adds no new domain logic.
 * Gated by `user:read` at the platform scope (admin-only — PII). Mirrors
 * GetOrganizationAdminDetail (#175).
 */
export class GetUserAdminDetail {
  constructor(
    private readonly users: UserAdminRepository,
    private readonly grants: GrantRepository,
    private readonly organizations: OrganizationReader,
    private readonly activity: UserActivityReader,
    private readonly scopeNames: ScopeNameReader,
  ) {}

  async execute(query: GetUserAdminDetailQuery): Promise<UserAdminDetail> {
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    const [grants, organizations, activity] = await Promise.all([
      this.grants.findByPrincipal(user.id),
      this.organizations.listForUser(user.id),
      this.activity.recentForUser(user.id, ACTIVITY_LIMIT),
    ]);

    const grantViews = await Promise.all(
      grants.map((g) => this.toGrantView(g.toSnapshot())),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      grants: grantViews,
      organizations,
      activity,
    };
  }

  private async toGrantView(s: GrantSnapshot): Promise<UserGrantView> {
    const scopeId = 'id' in s.scope ? s.scope.id : null;
    const scopeName =
      scopeId !== null
        ? await this.scopeNames.nameFor(s.scope.type, scopeId)
        : null;
    return {
      id: s.id,
      roleId: s.roleId,
      scopeType: s.scope.type,
      scopeId,
      scopeName,
      grantedByPrincipalId: s.grantedByPrincipalId,
      grantedAt: s.grantedAt,
      expiresAt: s.expiresAt,
    };
  }
}
