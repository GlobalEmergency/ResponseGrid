export const USER_ADMIN_REPOSITORY = Symbol('UserAdminRepository');

/**
 * Read-model row for the admin users console. Distinct from the auth-critical
 * {@link User} aggregate: it carries the PII + lifecycle fields the admin list
 * needs (registration date, last login) without touching the login/register
 * domain entity. PII — only reachable behind `user:read` at the platform scope.
 */
export interface UserAdminRow {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  /** ISO 8601 registration date. */
  createdAt: string;
  /** ISO 8601 last successful login, or null if the user never logged in. */
  lastLoginAt: string | null;
}

/**
 * Admin-only directory over the whole user base. Separate from
 * {@link UserRepository} (which the auth flows use) so the admin read model can
 * evolve independently. Implementations MUST use the typed query builder so
 * timestamptz columns are returned as Date, not string.
 */
export interface UserAdminRepository {
  /** Every user, for the global admin list. */
  listAll(): Promise<UserAdminRow[]>;
  /** A single user by id, or null if unknown. */
  findById(id: string): Promise<UserAdminRow | null>;
}
