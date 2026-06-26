import { ResourceRepository } from '../domain/ports/resource.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OrganizationAccreditationReader } from '../domain/ports/organization-accreditation-reader';
import { ResourceId } from '../domain/resource-id';
import { VerificationLevel } from '../domain/resource-enums';
import { ResourceNotFoundError } from './resource-not-found.error';

export interface VerifyResourceCommand {
  resourceId: string;
  coordinatorId: string;
}

export class VerifyResource {
  constructor(
    private readonly repo: ResourceRepository,
    private readonly bus: EventBus,
    private readonly accreditationReader: OrganizationAccreditationReader,
  ) {}

  async execute(cmd: VerifyResourceCommand): Promise<void> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);

    const level = await this.resolveLevel(resource);

    resource.verify(level, cmd.coordinatorId);
    await this.repo.save(resource);
    await this.bus.publish(resource.pullDomainEvents());
  }

  private async resolveLevel(resource: {
    ownerOrganizationId: string | null;
    emergencyId: { value: string };
  }): Promise<VerificationLevel> {
    if (!resource.ownerOrganizationId) return VerificationLevel.Verified;

    const accredited = await this.accreditationReader.isAccredited(
      resource.ownerOrganizationId,
      resource.emergencyId.value,
    );

    return accredited ? VerificationLevel.Official : VerificationLevel.Verified;
  }
}
