import { NeedRepository } from '../domain/ports/need.repository';
import { EventBus } from '../domain/ports/event-bus';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, NeedCategory, PersonnelSkill } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { NeedItem } from '../domain/need-item';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';

const ACTIVE_STATUS = 'active';

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
  /** F05: optional personnel-need fields */
  requiredSkill?: PersonnelSkill | null;
  skillSpecialty?: string | null;
  requestedCount?: number | null;
  /** Optional link to the resource / final recipient (#60). */
  resourceId?: string | null;
}

export class CreateNeed {
  constructor(
    private readonly repo: NeedRepository,
    private readonly bus: EventBus,
    private readonly emergencyStatusReader: NeedEmergencyStatusReader,
  ) {}

  async execute(cmd: CreateNeedCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

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

    // Individual requesters (no organization) get approximate coordinates in
    // public responses to protect their privacy (GDPR minimisation principle).
    // Organizational requesters get exact coordinates (public logistics).
    const locationSensitivity: LocationSensitivity =
      cmd.requesterOrganizationId === null
        ? LocationSensitivity.Approximate
        : LocationSensitivity.Public;

    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      title: cmd.title,
      description: cmd.description,
      location,
      priority: cmd.priority,
      requesterUserId: cmd.requesterUserId,
      requesterOrganizationId: cmd.requesterOrganizationId,
      locationSensitivity,
      items,
      requiredSkill: cmd.requiredSkill ?? null,
      skillSpecialty: cmd.skillSpecialty ?? null,
      requestedCount: cmd.requestedCount ?? null,
      resourceId: cmd.resourceId ?? null,
    });

    await this.repo.save(need);
    await this.bus.publish(need.pullDomainEvents());
    return { id: need.id.value };
  }
}
