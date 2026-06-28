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

/** Raised when an edit would leave the offer with an empty description. */
export class OfferDescriptionRequiredError extends Error {
  constructor() {
    super('An offer must keep a non-empty description');
    this.name = 'OfferDescriptionRequiredError';
  }
}

/** Raised when an edit would set the offer quantity to zero or a negative value. */
export class OfferQuantityInvalidError extends Error {
  constructor() {
    super('Offer quantity must be greater than 0');
    this.name = 'OfferQuantityInvalidError';
  }
}
