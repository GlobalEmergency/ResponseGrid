/**
 * Port — needs context.
 *
 * Lets CreateNeed validate the optional `resourceId` link (#60) without
 * depending on the resources context: confirms the resource exists AND belongs
 * to the given emergency, so a need can't be attached to a foreign or
 * cross-emergency resource.
 */
export const NEED_RESOURCE_READER = Symbol('NeedResourceReader');

export interface NeedResourceReader {
  /** True when a resource with this id exists in the given emergency. */
  existsInEmergency(resourceId: string, emergencyId: string): Promise<boolean>;
}
