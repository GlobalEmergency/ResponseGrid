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
export class InvalidPublicStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition public status from "${from}" to "${to}"`);
    this.name = 'InvalidPublicStatusTransitionError';
  }
}
export class ResourceNotPublishedError extends Error {
  constructor() {
    super(
      'Resource must be published (Active/Saturated/Paused/Closed) before changing its status',
    );
    this.name = 'ResourceNotPublishedError';
  }
}
export class ResourceAlreadyPublishedError extends Error {
  constructor() {
    super('Resource is already published; use changePublicStatus to update it');
    this.name = 'ResourceAlreadyPublishedError';
  }
}
export class FinalRecipientMustBeDestinationError extends Error {
  constructor(stage: string) {
    super(`A final recipient must be at the destination stage; got "${stage}"`);
    this.name = 'FinalRecipientMustBeDestinationError';
  }
}
export class ResourceNotPendingError extends Error {
  constructor() {
    super('Only a resource pending verification can be discarded');
    this.name = 'ResourceNotPendingError';
  }
}
export class ResourceNotEditableError extends Error {
  constructor() {
    super('A discarded resource can no longer be edited');
    this.name = 'ResourceNotEditableError';
  }
}
export class ResourceNameRequiredError extends Error {
  constructor() {
    super('A resource must keep a non-empty name');
    this.name = 'ResourceNameRequiredError';
  }
}
