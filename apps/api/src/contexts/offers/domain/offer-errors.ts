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

export class OfferAlreadyCancelledError extends Error {
  constructor() {
    super('Offer is already cancelled');
    this.name = 'OfferAlreadyCancelledError';
  }
}

export class OfferCannotBeCancelledError extends Error {
  constructor(status: string) {
    super(`Offer in status '${status}' cannot be cancelled`);
    this.name = 'OfferCannotBeCancelledError';
  }
}
