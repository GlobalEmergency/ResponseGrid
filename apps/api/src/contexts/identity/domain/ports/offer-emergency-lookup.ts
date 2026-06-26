/**
 * Port used by the authorization layer to resolve which emergency owns a given offer.
 *
 * Infrastructure note: this port is intentionally placed in the identity context because
 * authorization (guard enforcement) lives there. The adapter reads the `offers` table
 * from the offers context schema — an accepted cross-context infra coupling kept
 * explicitly in the adapter so the domain stays clean.
 */
export const OFFER_EMERGENCY_LOOKUP = Symbol('OfferEmergencyLookup');

export interface OfferEmergencyLookup {
  /** Returns the emergencyId that owns the offer, or null when the offer does not exist. */
  findEmergencyId(offerId: string): Promise<string | null>;
}
