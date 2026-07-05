/**
 * Port — needs context.
 *
 * Resolves which emergency a resource belongs to, so CreateNeed can enforce
 * that an optional `resourceId` link (#60) points to a real resource of the
 * same emergency. Kept in the needs domain to stay independent; the Drizzle
 * adapter (which reads the `resources` table) lives in infrastructure.
 */
export const NEED_RESOURCE_READER = Symbol('NeedResourceReader');

export interface NeedResourceReader {
  /** Emergency the resource belongs to, or null when it does not exist. */
  getEmergencyId(resourceId: string): Promise<string | null>;
}
