import { NeedRepository } from '../domain/ports/need.repository';
import { EventBus } from '../domain/ports/event-bus';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, NeedCategory } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { NeedItem } from '../domain/need-item';

export interface CreateNeedItemCommand {
  name: string;
  quantity: number;
  unit: string | null;
  category: NeedCategory;
}

export interface CreateNeedLocationCommand {
  address: string;
  latitude: number;
  longitude: number;
}

export interface CreateNeedCommand {
  emergencyId: string;
  requesterUserId: string;
  requesterOrganizationId: string | null;
  title: string;
  description: string | null;
  location: CreateNeedLocationCommand;
  priority: Priority;
  items: CreateNeedItemCommand[];
}

export class CreateNeed {
  constructor(
    private readonly repo: NeedRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: CreateNeedCommand): Promise<{ id: string }> {
    const location = Location.create({
      address: cmd.location.address,
      latitude: cmd.location.latitude,
      longitude: cmd.location.longitude,
    });

    const items = cmd.items.map((i) =>
      NeedItem.create({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
      }),
    );

    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      title: cmd.title,
      description: cmd.description,
      location,
      priority: cmd.priority,
      requesterUserId: cmd.requesterUserId,
      requesterOrganizationId: cmd.requesterOrganizationId,
      items,
    });

    await this.repo.save(need);
    await this.bus.publish(need.pullDomainEvents());
    return { id: need.id.value };
  }
}
