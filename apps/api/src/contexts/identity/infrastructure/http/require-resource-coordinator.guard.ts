import { RESOURCE_EMERGENCY_LOOKUP } from '../../domain/ports/resource-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireResourceCoordinatorGuard = makeEntityCoordinatorGuard(
  RESOURCE_EMERGENCY_LOOKUP,
  'resourceId',
  'Resource',
);
