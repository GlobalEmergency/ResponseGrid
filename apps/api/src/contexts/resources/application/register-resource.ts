import { ResourceRepository } from '../domain/ports/resource.repository';
import { EventBus } from '../domain/ports/event-bus';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../domain/emergency-id';
import { ResourceType, ResourceSide } from '../domain/resource-enums';

export interface RegisterResourceCommand {
  emergencyId: string;
  type: ResourceType;
  side: ResourceSide;
  name: string;
}

export class RegisterResource {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: RegisterResourceCommand): Promise<{ id: string }> {
    const resource = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      type: cmd.type,
      side: cmd.side,
      name: cmd.name,
    });
    await this.repo.save(resource);
    await this.bus.publish(resource.pullDomainEvents());
    return { id: resource.id.value };
  }
}
