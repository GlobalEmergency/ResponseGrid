export const EMERGENCY_DISPUTE_THRESHOLD_READER = Symbol(
  'EmergencyDisputeThresholdReader',
);

export interface EmergencyDisputeThresholdReader {
  /** Returns the per-emergency threshold, or null when not configured. */
  getThreshold(emergencyId: string): Promise<number | null>;
}
