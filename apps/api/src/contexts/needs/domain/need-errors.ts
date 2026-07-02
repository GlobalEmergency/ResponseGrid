export class NeedNotPendingError extends Error {
  constructor() {
    super('Need must be in pending status to be validated or rejected');
    this.name = 'NeedNotPendingError';
  }
}

/** Raised when editing a need that is in a terminal status (rejected/fulfilled). */
export class NeedNotEditableError extends Error {
  constructor() {
    super('A rejected or fulfilled need can no longer be edited');
    this.name = 'NeedNotEditableError';
  }
}

/** Raised when an edit would leave the need with an empty title. */
export class NeedTitleRequiredError extends Error {
  constructor() {
    super('A need must keep a non-empty title');
    this.name = 'NeedTitleRequiredError';
  }
}

/**
 * Raised when a need is linked (#60) to a `resourceId` that does not exist or
 * belongs to a different emergency. Both cases collapse to the same client
 * error: the referenced resource is not part of this emergency.
 */
export class NeedResourceNotInEmergencyError extends Error {
  constructor(resourceId: string) {
    super(`Resource ${resourceId} does not exist in this emergency`);
    this.name = 'NeedResourceNotInEmergencyError';
  }
}
