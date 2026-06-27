/**
 * DrizzlePersonnelTaskCreator — implementation of the PersonnelTaskCreatorPort
 * defined in the needs context.
 *
 * Delegates to the existing CreateTask + AssignVolunteerToTask use cases so
 * that no task-creation logic is duplicated.
 */

import {
  PersonnelTaskCreatorPort,
  CreateTaskFromNeedParams,
  CreatedTaskResult,
} from '../../../needs/domain/ports/personnel-task-creator.port';
import { CreateTask } from '../../application/create-task';
import { AssignVolunteerToTask } from '../../application/assign-volunteer-to-task';
import { TaskRepository } from '../../domain/ports/task.repository';
import { TaskId } from '../../domain/task-id';
import { VolunteerSkill } from '../../domain/volunteer-enums';

export class DrizzlePersonnelTaskCreator implements PersonnelTaskCreatorPort {
  constructor(
    private readonly createTask: CreateTask,
    private readonly assignVolunteer: AssignVolunteerToTask,
    private readonly taskRepo: TaskRepository,
  ) {}

  async createTaskFromNeed(
    params: CreateTaskFromNeedParams,
  ): Promise<CreatedTaskResult> {
    // 1. Create the task (linkedNeedId passed through the command)
    const { id: taskId } = await this.createTask.execute({
      emergencyId: params.emergencyId,
      title: params.title,
      description: params.description ?? params.title,
      requiredSkill: (params.requiredSkill as VolunteerSkill) ?? null,
      createdByUserId: params.createdByUserId,
      linkedNeedId: params.linkedNeedId,
    });

    // 2. Assign each volunteer (fire sequentially to preserve domain invariants)
    for (const volunteerId of params.volunteerIds) {
      await this.assignVolunteer.execute({ taskId, volunteerId });
    }

    // 3. Re-fetch the task to build the result DTO (includes up-to-date assignments)
    const task = await this.taskRepo.findById(TaskId.fromString(taskId));
    if (!task) {
      throw new Error(
        `Task ${taskId} disappeared after creation — this should never happen`,
      );
    }

    const snap = task.toSnapshot();
    return {
      id: snap.id,
      emergencyId: snap.emergencyId,
      title: snap.title,
      description: snap.description,
      requiredSkill: snap.requiredSkill,
      linkedNeedId: snap.linkedNeedId ?? null,
      status: snap.status,
      createdByUserId: snap.createdByUserId,
      createdAt: snap.createdAt,
      updatedAt: snap.updatedAt,
      assignments: snap.assignments.map((a) => ({
        volunteerId: a.volunteerId,
        assignedAt: a.assignedAt,
        checkedInAt: a.checkedInAt,
        checkedOutAt: a.checkedOutAt,
        status: a.status,
      })),
    };
  }
}
