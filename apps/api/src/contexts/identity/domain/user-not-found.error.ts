/**
 * Raised when an admin looks up a user by id that does not exist. Mapped to HTTP
 * 404 by the users-admin exception filter.
 */
export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`No user found with id: ${id}`);
    this.name = 'UserNotFoundError';
  }
}
