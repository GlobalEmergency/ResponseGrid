/**
 * PersonnelTaskCreatorPort — outbound port in the needs context for creating
 * and populating a Task from a Need without importing the Task domain directly.
 *
 * The implementation lives in volunteers infrastructure and delegates to the
 * CreateTask / AssignVolunteerToTask use cases that already exist there.
 */

export const PERSONNEL_TASK_CREATOR_PORT = Symbol('PersonnelTaskCreatorPort');

export interface CreateTaskFromNeedParams {
  emergencyId: string;
  title: string;
  description: string | null;
  requiredSkill: string | null;
  linkedNeedId: string;
  volunteerIds: string[];
  createdByUserId: string;
}

export interface CreatedTaskResult {
  id: string;
  emergencyId: string;
  title: string;
  description: string;
  requiredSkill: string | null;
  linkedNeedId: string | null;
  status: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{
    volunteerId: string;
    assignedAt: Date;
    checkedInAt: Date | null;
    checkedOutAt: Date | null;
    status: string;
  }>;
}

export interface PersonnelTaskCreatorPort {
  createTaskFromNeed(
    params: CreateTaskFromNeedParams,
  ): Promise<CreatedTaskResult>;
}
