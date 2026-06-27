import { NeedRepository } from '../domain/ports/need.repository';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedId } from '../domain/need-id';
import {
  PersonnelTaskCreatorPort,
  CreatedTaskResult,
} from '../domain/ports/personnel-task-creator.port';

export const CREATE_TASK_FROM_NEED = Symbol('CreateTaskFromNeed');

export interface CreateTaskFromNeedCommand {
  needId: string;
  volunteerIds: string[];
  dueDate?: string | undefined;
  createdByUserId: string;
}

export class CreateTaskFromNeed {
  constructor(
    private readonly needRepo: NeedRepository,
    private readonly taskCreator: PersonnelTaskCreatorPort,
  ) {}

  async execute(cmd: CreateTaskFromNeedCommand): Promise<CreatedTaskResult> {
    const need = await this.needRepo.findById(NeedId.fromString(cmd.needId));
    if (!need) throw new NeedNotFoundError(cmd.needId);

    const title = `Personal: ${need.title}`;
    const description = need.description ?? need.title;

    return this.taskCreator.createTaskFromNeed({
      emergencyId: need.emergencyId.value,
      title,
      description,
      requiredSkill: need.requiredSkill,
      linkedNeedId: need.id.value,
      volunteerIds: cmd.volunteerIds,
      createdByUserId: cmd.createdByUserId,
    });
  }
}
