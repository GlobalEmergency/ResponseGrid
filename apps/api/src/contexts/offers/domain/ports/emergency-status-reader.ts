/**
 * Port — offers context.
 *
 * Re-declares the same interface as other contexts' emergency status reader so
 * this context stays independent. The Drizzle adapter is shared in infrastructure.
 */
export const OFFER_EMERGENCY_STATUS_READER = Symbol(
  'OfferEmergencyStatusReader',
);

export interface OfferEmergencyStatusReader {
  /** Returns the current status string, or null when the emergency does not exist. */
  getStatus(emergencyId: string): Promise<string | null>;
}
