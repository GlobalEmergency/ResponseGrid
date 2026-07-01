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

/** Raised when the optional resourceId link points to a resource that does not
 *  exist or belongs to another emergency (#60). */
export class InvalidResourceLinkError extends Error {
  constructor(resourceId: string) {
    super(`Resource not found in this emergency: ${resourceId}`);
    this.name = 'InvalidResourceLinkError';
  }
}
