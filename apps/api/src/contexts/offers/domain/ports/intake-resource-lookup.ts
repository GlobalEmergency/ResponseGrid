export const INTAKE_RESOURCE_LOOKUP = Symbol('IntakeResourceLookup');

export interface IntakeResourceInfo {
  id: string;
  emergencyId: string;
  type: string;
  publicStatus: string;
}

export interface IntakeResourceLookup {
  findForIntake(resourceId: string): Promise<IntakeResourceInfo | null>;
}
