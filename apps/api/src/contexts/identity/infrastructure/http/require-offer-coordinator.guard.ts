import { OFFER_EMERGENCY_LOOKUP } from '../../domain/ports/offer-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireOfferCoordinatorGuard = makeEntityCoordinatorGuard(
  OFFER_EMERGENCY_LOOKUP,
  'offerId',
  'Offer',
);
