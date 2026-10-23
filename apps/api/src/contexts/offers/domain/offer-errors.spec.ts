import { OfferItemsRequiredError } from './offer-errors';

describe('OfferItemsRequiredError', () => {
  it('exposes a stable code for the web to localize (#348), independent of the message prose', () => {
    const error = new OfferItemsRequiredError();
    expect(error.code).toBe('offer_items_required');
    expect(error.message).toBe('An offer must have at least one supply line');
  });
});
