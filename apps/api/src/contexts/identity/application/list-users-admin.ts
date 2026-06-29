import {
  UserAdminRepository,
  UserAdminRow,
} from '../domain/ports/user-admin.repository';
import { GrantRepository } from '../domain/ports/grant.repository';
import { UserAdminListItem } from './user-admin-view';

/**
 * Admin global list of ALL users, enriched with a distinct-roles summary and an
 * active-grant count so the console can show who holds what at a glance. PII
 * (emails, names): gated by `user:read` at the platform scope at the controller,
 * which only `platform_admin` holds — see role-catalog.ts. Mirrors
 * ListOrganizationsAdmin (#175).
 */
export class ListUsersAdmin {
  constructor(
    private readonly users: UserAdminRepository,
    private readonly grants: GrantRepository,
  ) {}

  async execute(): Promise<UserAdminListItem[]> {
    const rows = await this.users.listAll();
    const now = new Date();

    const items = await Promise.all(
      rows.map(async (row): Promise<UserAdminListItem> => {
        const grants = await this.grants.findByPrincipal(row.id);
        const active = grants.filter((g) => g.isActive(now));
        const roles = [...new Set(active.map((g) => g.roleId))].sort();
        return {
          ...this.baseFields(row),
          roles,
          grantCount: active.length,
        };
      }),
    );

    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  private baseFields(
    row: UserAdminRow,
  ): Omit<UserAdminListItem, 'roles' | 'grantCount'> {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      isAdmin: row.isAdmin,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
    };
  }
}
