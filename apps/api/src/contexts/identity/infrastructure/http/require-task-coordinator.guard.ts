import { TASK_EMERGENCY_LOOKUP } from '../../domain/ports/task-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireTaskCoordinatorGuard = makeEntityCoordinatorGuard(
  TASK_EMERGENCY_LOOKUP,
  'taskId',
  'Task',
);
