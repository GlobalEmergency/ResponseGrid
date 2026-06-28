export enum GroupVisibility {
  /** Anyone can request to join (pending approval). */
  Public = 'public',
  /** Members are only added by a manager. */
  Private = 'private',
}

export enum GroupMemberStatus {
  Pending = 'pending',
  Approved = 'approved',
}

/**
 * A group hangs off either an organization (permanent team) or an emergency
 * (cuadrilla for one crisis). This is also the group's parent in the
 * authorization scope chain. See docs/features/13 §6, §18.3-b.
 */
export type GroupOwnerScope =
  | { kind: 'organization'; organizationId: string }
  | { kind: 'emergency'; emergencyId: string };
