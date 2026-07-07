import { NeedRepository } from '../domain/ports/need.repository';
import { EventBus } from '../domain/ports/event-bus';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedResourceReader } from '../domain/ports/resource-reader';
import { NeedResourceNotInEmergencyError } from '../domain/need-errors';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, PersonnelSkill } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { SupplyLine } from '@globalemergency/warehouse-core/kernel';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';
import { Author, AuthorProps } from '../../../shared/domain/author';

const ACTIVE_STATUS = 'active';

export interface CreateNeedItemCommand {
  name: string;
  quantity: number;
  unit: string | null;
  /** Slug de categoría (data-driven); el formato lo valida SupplyLine. */
  category: string;
  supplyId?: string | null;
  /** Presentation / route of administration (#61). Optional. */
  presentation?: string | null;
  expiresAt?: string | null;
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
  /**
   * Optional restricted author attribution (#235): the real person a trusted
   * integration filed this need on behalf of. Validated into an {@link Author}.
   */
  author?: AuthorProps | null;
}

export class CreateNeed {
  constructor(
    private readonly repo: NeedRepository,
    private readonly bus: EventBus,
    private readonly emergencyStatusReader: NeedEmergencyStatusReader,
    /**
     * Optional — only needed to validate the optional `resourceId` link (#60).
     * When a link is requested but no reader is wired, the link is rejected
     * (fail closed) rather than persisted unverified.
     */
    private readonly resourceReader?: NeedResourceReader,
  ) {}

  async execute(cmd: CreateNeedCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    // A need may link to a resource / final recipient (#60). Enforce that the
    // link points to a real resource of THIS emergency — a missing reader,
    // unknown resource, or cross-emergency resource all collapse to the same
    // rejection, so a spoofed resourceId can never create a dangling link.
    if (cmd.resourceId != null) {
      const linkedEmergencyId = await this.resourceReader?.getEmergencyId(
        cmd.resourceId,
      );
      if (linkedEmergencyId !== cmd.emergencyId) {
        throw new NeedResourceNotInEmergencyError(cmd.resourceId);
      }
    }

    const location = Location.create({
      address: cmd.location.address,
      latitude: cmd.location.latitude,
      longitude: cmd.location.longitude,
    });

    const items = cmd.items.map((i) =>
      SupplyLine.create({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        supplyId: i.supplyId ?? null,
        presentation: i.presentation ?? null,
        expiresAt: i.expiresAt ?? null,
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
      author: cmd.author ? Author.create(cmd.author) : null,
    });

    await this.repo.save(need);
    await this.bus.publish(need.pullDomainEvents());
    return { id: need.id.value };
  }
}
