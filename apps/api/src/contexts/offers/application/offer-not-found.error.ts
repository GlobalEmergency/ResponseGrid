export class OfferNotFoundError extends Error {
  constructor(id: string) {
    super(`Offer not found: ${id}`);
    this.name = 'OfferNotFoundError';
  }
}
