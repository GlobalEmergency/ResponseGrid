/**
 * Port used by the authorization layer to resolve which emergency owns a given
 * donation intake pre-registration.
 */
export const INTAKE_EMERGENCY_LOOKUP = Symbol('IntakeEmergencyLookup');

export interface IntakeEmergencyLookup {
  /** Returns the emergencyId that owns the intake, or null when it does not exist. */
  findEmergencyId(intakeId: string): Promise<string | null>;
}
