import { REPORT_EMERGENCY_LOOKUP } from '../../domain/ports/report-emergency-lookup';
import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const RequireReportCoordinatorGuard = makeEntityCoordinatorGuard(
  REPORT_EMERGENCY_LOOKUP,
  'reportId',
  'Report',
);
