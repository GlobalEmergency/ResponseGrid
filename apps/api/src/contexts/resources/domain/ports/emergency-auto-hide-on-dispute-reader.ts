export const EMERGENCY_AUTO_HIDE_ON_DISPUTE_READER = Symbol(
  'EmergencyAutoHideOnDisputeReader',
);

/**
 * Reads the per-emergency opt-in auto-hide-on-dispute policy (#171): when
 * enabled, `resource.disputed` is resolved automatically on threshold instead
 * of waiting for a coordinator. Mirrors {@link EmergencyDisputeThresholdReader}
 * — a dedicated port owned by the resources context (DIP), backed by a shared
 * adapter that reads the emergencies table directly.
 */
export interface EmergencyAutoHideOnDisputeReader {
  /** Returns whether the policy is on for this emergency (off by default). */
  getAutoHideOnDispute(emergencyId: string): Promise<boolean>;
}
