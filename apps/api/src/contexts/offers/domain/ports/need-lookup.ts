/**
 * Port used by the offers context to validate that a target need exists and
 * belongs to the expected emergency.
 *
 * Infrastructure note: this port is satisfied by a Drizzle adapter that reads
 * the `needs` table — an accepted cross-context infra coupling documented here.
 */
export const OFFER_NEED_LOOKUP = Symbol('OfferNeedLookup');

export interface NeedLocation {
  latitude: number;
  longitude: number;
  emergencyId: string;
}

export interface NeedLookup {
  /**
   * Returns the emergencyId of the need, or null if the need does not exist.
   */
  findEmergencyId(needId: string): Promise<string | null>;

  /**
   * Returns the category of the need, or null if the need does not exist.
   */
  findCategory(needId: string): Promise<string | null>;

  /**
   * Returns location and emergencyId of the need, or null if not found.
   */
  findLocation(needId: string): Promise<NeedLocation | null>;
}
