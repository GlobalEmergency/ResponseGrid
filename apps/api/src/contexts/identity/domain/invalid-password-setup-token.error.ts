/**
 * Raised when a presented set-password token does not exist, has expired, or has
 * already been used. Deliberately one error for all three cases so the response
 * never distinguishes them (no oracle for probing tokens).
 */
export class InvalidPasswordSetupTokenError extends Error {
  constructor() {
    super('Invalid or expired password setup token');
    this.name = 'InvalidPasswordSetupTokenError';
  }
}
