/**
 * Port — needs context.
 *
 * Re-declares the same interface as the emergencies domain port so this context
 * stays independent. The Drizzle adapter is shared in infrastructure (DRY).
 */
export const NEED_EMERGENCY_STATUS_READER = Symbol('NeedEmergencyStatusReader');

export interface NeedEmergencyStatusReader {
  /** Returns the current status string, or null when the emergency does not exist. */
  getStatus(emergencyId: string): Promise<string | null>;
}
