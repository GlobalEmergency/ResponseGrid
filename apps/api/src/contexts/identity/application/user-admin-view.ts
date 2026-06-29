import { UserOrganizationMembership } from '../domain/ports/organization-reader';
import { UserActivityEntry } from '../domain/ports/user-activity-reader';

/** A grant held by a user, enriched with a resolved scope display name. */
export interface UserGrantView {
  id: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  /** Display name of the scope (org/emergency/group), when resolvable. */
  scopeName: string | null;
  grantedByPrincipalId: string | null;
  /** ISO 8601. */
  grantedAt: string;
  /** ISO 8601 or null. */
  expiresAt: string | null;
}

/** Row of the admin global users list. */
export interface UserAdminListItem {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  /** ISO 8601 registration date. */
  createdAt: string;
  /** ISO 8601 last login, or null. */
  lastLoginAt: string | null;
  /** Distinct roles the user holds across every scope (for an at-a-glance summary). */
  roles: string[];
  /** Number of active grants the user holds. */
  grantCount: number;
}

/** Full admin detail of a single user. */
export interface UserAdminDetail {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  grants: UserGrantView[];
  organizations: UserOrganizationMembership[];
  activity: UserActivityEntry[];
}
