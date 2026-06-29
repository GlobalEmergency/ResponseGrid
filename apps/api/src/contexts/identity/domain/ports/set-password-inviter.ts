export const SET_PASSWORD_INVITER = Symbol('SetPasswordInviter');

export interface SetPasswordInvite {
  userId: string;
  email: string;
  name: string;
}

/**
 * Port for inviting a freshly-created, passwordless account to set its password
 * — e.g. a profile auto-created when an anonymous donor pre-registers (#168).
 *
 * The actual email delivery is intentionally NOT implemented yet: the default
 * adapter is a no-op seam so the call site is wired and a real notifier
 * (notifications/email) can be dropped in later without touching callers.
 */
export interface SetPasswordInviter {
  invite(invite: SetPasswordInvite): Promise<void>;
}
