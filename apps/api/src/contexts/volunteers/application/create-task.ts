import { TaskRepository } from '../domain/ports/task.repository';
import { Task } from '../domain/task';
import { TaskId } from '../domain/task-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { VolunteerSkill } from '../domain/volunteer-enums';
import { Location } from '../../../shared/domain/location';

export interface CreateTaskCommand {
  emergencyId: string;
  title: string;
  description: string;
  location?: { address: string; latitude: number; longitude: number } | null;
  requiredSkill?: VolunteerSkill | null;
  createdByUserId: string;
  /** F05: optional link back to the need that originated this task */
  linkedNeedId?: string | null;
}

export class CreateTask {
  constructor(private readonly repo: TaskRepository) {}

  async execute(cmd: CreateTaskCommand): Promise<{ id: string }> {
    const location =
      cmd.location != null
        ? Location.create({
            address: cmd.location.address,
            latitude: cmd.location.latitude,
            longitude: cmd.location.longitude,
          })
        : null;

    const task = Task.create({
      id: TaskId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      title: cmd.title,
      description: cmd.description,
      location,
      requiredSkill: cmd.requiredSkill ?? null,
      createdByUserId: cmd.createdByUserId,
      linkedNeedId: cmd.linkedNeedId ?? null,
    });

    await this.repo.save(task);
    return { id: task.id.value };
  }
}
