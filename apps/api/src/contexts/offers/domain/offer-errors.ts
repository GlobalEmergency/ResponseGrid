export class OfferNotOpenError extends Error {
  constructor() {
    super('Offer must be in Open status to be matched');
    this.name = 'OfferNotOpenError';
  }
}

export class OfferNotMatchedError extends Error {
  constructor() {
    super('Offer must be in Matched status to be fulfilled');
    this.name = 'OfferNotMatchedError';
  }
}

export class OfferCannotBeCancelledError extends Error {
  constructor(status: string) {
    super(`Offer in status '${status}' cannot be cancelled`);
    this.name = 'OfferCannotBeCancelledError';
  }
}

/** Raised when editing an offer that is in a terminal status (fulfilled/cancelled). */
export class OfferNotEditableError extends Error {
  constructor() {
    super('A fulfilled or cancelled offer can no longer be edited');
    this.name = 'OfferNotEditableError';
  }
}

/** Raised when an offer would be left without any supply line. */
export class OfferItemsRequiredError extends Error {
  constructor() {
    super('An offer must have at least one supply line');
    this.name = 'OfferItemsRequiredError';
  }
}
