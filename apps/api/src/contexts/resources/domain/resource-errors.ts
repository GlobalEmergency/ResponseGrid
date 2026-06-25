export class InvalidVerificationLevelError extends Error {
  constructor(level: string) {
    super(`Cannot verify with level "${level}"; use verified or official`);
    this.name = 'InvalidVerificationLevelError';
  }
}
export class ResourceNotVerifiedError extends Error {
  constructor() {
    super('Resource must be verified before it can be published');
    this.name = 'ResourceNotVerifiedError';
  }
}
