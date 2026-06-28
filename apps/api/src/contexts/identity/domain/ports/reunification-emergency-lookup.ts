export const REUNIFICATION_EMERGENCY_LOOKUP = Symbol(
  'ReunificationEmergencyLookup',
);

/**
 * Resolves the emergency that owns a missing-person report, for authorization.
 * Lives in identity (like the other *EmergencyLookup ports) because identity
 * owns cross-context authorization queries.
 */
export interface ReunificationEmergencyLookup {
  findEmergencyId(reportId: string): Promise<string | null>;
}
