export const CAPACITY_EMERGENCY_LOOKUP = Symbol('CapacityEmergencyLookup');

/**
 * Resolves the owning emergency of a transport capacity, so the controller can
 * decide whether the requester is a coordinator of that emergency (mirrors how
 * offers resolve an offer's emergency for the cancel authorization check).
 */
export interface CapacityEmergencyLookup {
  /** The capacity's emergency id, or null when the capacity does not exist. */
  findEmergencyId(capacityId: string): Promise<string | null>;
}
