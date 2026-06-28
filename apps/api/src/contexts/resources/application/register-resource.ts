import { ResourceRepository } from '../domain/ports/resource.repository';
import { EventBus } from '../domain/ports/event-bus';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { Resource, Provenance } from '../domain/resource';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Category } from '../../supplies/domain/category';
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
  // enriched optional fields
  contact?: string | null;
  schedule?: string | null;
  manager?: string | null;
  accepts?: string[];
  country?: string | null;
  city?: string | null;
  provenance?: Provenance | null;
  // destinatario final (#60)
  isFinalRecipient?: boolean;
  recipientType?: string | null;
  // inventario declarado del lugar (líneas de insumo / qué material tiene)
  items?: Array<{
    name: string;
    quantity: number;
    unit?: string | null;
    category: Category;
    presentation?: string | null;
  }>;
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
      contact: cmd.contact ?? null,
      schedule: cmd.schedule ?? null,
      manager: cmd.manager ?? null,
      accepts: cmd.accepts ?? [],
      country: cmd.country ?? null,
      city: cmd.city ?? null,
      provenance: cmd.provenance ?? null,
      isFinalRecipient: cmd.isFinalRecipient ?? false,
      recipientType: cmd.recipientType ?? null,
      items: (cmd.items ?? []).map((i) =>
        SupplyLine.create({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit ?? null,
          category: i.category,
          presentation: i.presentation ?? null,
        }),
      ),
    });
    await this.repo.save(resource);
    await this.bus.publish(resource.pullDomainEvents());
    return { id: resource.id.value };
  }
}
