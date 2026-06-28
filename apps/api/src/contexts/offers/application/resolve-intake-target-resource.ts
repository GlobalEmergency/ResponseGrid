import { InvalidIntakeTargetResourceError } from '../domain/donation-intake-errors';
import {
  IntakeResourceInfo,
  IntakeResourceLookup,
} from '../domain/ports/intake-resource-lookup';

export const INTAKE_COLLECTION_TYPES = new Set([
  'collection_point',
  'collection_and_delivery',
]);

export const INTAKE_ACTIVE_STATUS = 'active';

export async function resolveIntakeTargetResource(
  lookup: IntakeResourceLookup,
  resourceId: string,
  emergencyId?: string,
): Promise<IntakeResourceInfo> {
  const resource = await lookup.findForIntake(resourceId);
  if (!resource) {
    throw new InvalidIntakeTargetResourceError(resourceId, 'not found');
  }
  if (emergencyId !== undefined && resource.emergencyId !== emergencyId) {
    throw new InvalidIntakeTargetResourceError(
      resourceId,
      'belongs to another emergency',
    );
  }
  if (!INTAKE_COLLECTION_TYPES.has(resource.type)) {
    throw new InvalidIntakeTargetResourceError(
      resourceId,
      `type '${resource.type}' is not a collection point`,
    );
  }
  if (resource.publicStatus !== INTAKE_ACTIVE_STATUS) {
    throw new InvalidIntakeTargetResourceError(
      resourceId,
      `public status is '${resource.publicStatus}'`,
    );
  }
  return resource;
}
