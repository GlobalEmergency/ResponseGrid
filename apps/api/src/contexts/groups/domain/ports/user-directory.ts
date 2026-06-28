export const GROUP_USER_DIRECTORY = Symbol('GroupUserDirectory');

/** Resolves a user id from an email, for adding members by email. */
export interface GroupUserDirectory {
  findIdByEmail(email: string): Promise<string | null>;
}
