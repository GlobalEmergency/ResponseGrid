/**
 * No user matches the (normalised) phone number presented on the trusted
 * channel login (#315). Maps to HTTP 404 so the bot can fall back to the
 * register-by-phone flow. Carries no phone number in the message — it must not
 * leak into logs.
 */
export class UserNotFoundByPhoneError extends Error {
  constructor() {
    super('No user found for the given phone number');
    this.name = 'UserNotFoundByPhoneError';
  }
}
