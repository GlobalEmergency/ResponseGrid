/**
 * Port — reunification context.
 *
 * Re-declares the same interface as in other contexts so this context stays
 * independent (no import across bounded context domain layers).
 * The DrizzleEmergencyStatusReader adapter is shared at the infra layer.
 */
export const REUNIFICATION_EMERGENCY_STATUS_READER = Symbol(
  'ReunificationEmergencyStatusReader',
);

export interface ReunificationEmergencyStatusReader {
  /** Returns the current status string, or null when the emergency does not exist. */
  getStatus(emergencyId: string): Promise<string | null>;
}
