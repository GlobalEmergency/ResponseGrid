import { VOLUNTEER_EMERGENCY_LOOKUP } from '../../domain/ports/volunteer-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireVolunteerCoordinatorGuard = makeEntityCoordinatorGuard(
  VOLUNTEER_EMERGENCY_LOOKUP,
  'volunteerId',
  'Volunteer',
);
