import { NEED_EMERGENCY_LOOKUP } from '../../domain/ports/need-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireNeedCoordinatorGuard = makeEntityCoordinatorGuard(
  NEED_EMERGENCY_LOOKUP,
  'needId',
  'Need',
);
