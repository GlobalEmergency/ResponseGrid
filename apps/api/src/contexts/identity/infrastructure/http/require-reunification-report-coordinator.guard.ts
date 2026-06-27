import { makeEntityCoordinatorGuard } from './entity-coordinator-guard.factory';

export const REUNIFICATION_REPORT_EMERGENCY_LOOKUP = Symbol(
  'ReunificationReportEmergencyLookup',
);

export const RequireReunificationReportCoordinatorGuard =
  makeEntityCoordinatorGuard(
    REUNIFICATION_REPORT_EMERGENCY_LOOKUP,
    'reportId',
    'MissingPersonReport',
  );
