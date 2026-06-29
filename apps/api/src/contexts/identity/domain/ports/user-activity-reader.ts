export const USER_ACTIVITY_READER = Symbol('UserActivityReader');

/** A recent action performed by a user, surfaced in the admin user detail. */
export interface UserActivityEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  emergencyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/**
 * Output port (DIP) the identity admin use cases use to read a user's recent
 * activity from the audit trail — owned by the audit context, adapted here so
 * identity does not depend on that context's module (which already depends on
 * identity, so importing it back would be a cycle).
 */
export interface UserActivityReader {
  recentForUser(userId: string, limit: number): Promise<UserActivityEntry[]>;
}
