import { EmergencyNotAcceptingIntakeError } from '../emergency-not-accepting-intake.error';
import { EmergencyStatus } from '../emergency-status';

/**
 * Port used by intake use-cases (CreateNeed, RegisterResource) to enforce
 * the kill-switch rule: intake is only accepted when the emergency is Active.
 *
 * Defined in the emergencies domain so each consuming context (resources, needs)
 * can declare the same interface in their own domain/ports and wire up the shared
 * Drizzle adapter in infrastructure — one adapter, two ports by convention.
 */
export const EMERGENCY_STATUS_READER = Symbol('EmergencyStatusReader');

export interface EmergencyStatusReader {
  /**
   * Returns the current status of the emergency.
   * Returns null when the emergency does not exist (treated as not accepting).
   */
  getStatus(emergencyId: string): Promise<EmergencyStatus | null>;
}

/**
 * Domain rule helper — throws EmergencyNotAcceptingIntakeError if
 * the emergency is not Active. Use this in intake use-cases.
 */
export async function assertAcceptingIntake(
  reader: EmergencyStatusReader,
  emergencyId: string,
): Promise<void> {
  const status = await reader.getStatus(emergencyId);
  if (status !== EmergencyStatus.Active) {
    throw new EmergencyNotAcceptingIntakeError(
      emergencyId,
      status ?? 'not-found',
    );
  }
}
