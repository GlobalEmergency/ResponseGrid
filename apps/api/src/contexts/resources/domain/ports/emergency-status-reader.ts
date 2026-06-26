/**
 * Port — resources context.
 *
 * Re-declares the same interface as the emergencies domain port so this context
 * stays independent (no import across bounded context domain layers).
 * The Drizzle adapter is shared in infrastructure (DRY at the infra layer).
 */
export const RESOURCE_EMERGENCY_STATUS_READER = Symbol(
  'ResourceEmergencyStatusReader',
);

export interface ResourceEmergencyStatusReader {
  /** Returns the current status string, or null when the emergency does not exist. */
  getStatus(emergencyId: string): Promise<string | null>;
}
