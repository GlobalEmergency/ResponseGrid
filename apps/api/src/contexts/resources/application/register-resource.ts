import { ResourceRepository } from '../domain/ports/resource.repository';
import { EventBus } from '../domain/ports/event-bus';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType, ResourceStage } from '../domain/resource-enums';
import { Location, LocationProps } from '../../../shared/domain/location';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export interface RegisterResourceCommand {
  emergencyId: string;
  type: ResourceType;
  stage: ResourceStage;
  name: string;
  description?: string | null;
  location: LocationProps;
  ownerUserId: string;
  ownerOrganizationId?: string | null;
}

export class RegisterResource {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly bus: EventBus,
    private readonly emergencyStatusReader: ResourceEmergencyStatusReader,
  ) {}

  async execute(cmd: RegisterResourceCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    const resource = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      type: cmd.type,
      stage: cmd.stage,
      name: cmd.name,
      description: cmd.description ?? null,
      location: Location.create(cmd.location),
      ownerUserId: cmd.ownerUserId,
      ownerOrganizationId: cmd.ownerOrganizationId ?? null,
    });
    await this.repo.save(resource);
    await this.bus.publish(resource.pullDomainEvents());
    return { id: resource.id.value };
  }
}
