import { NeedRepository } from '../domain/ports/need.repository';
import { EventBus } from '../domain/ports/event-bus';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedResourceReader } from '../domain/ports/resource-reader';
import { InvalidResourceLinkError } from '../domain/need-errors';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, Category, PersonnelSkill } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';
import { Author, AuthorProps } from '../../../shared/domain/author';

const ACTIVE_STATUS = 'active';

export interface CreateNeedItemCommand {
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
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
    // Defaults to accept-any so callers that never pass resourceId (and older
    // tests) need not wire a reader; the DI module always injects the real one.
    private readonly resourceReader: NeedResourceReader = {
      existsInEmergency: () => Promise.resolve(true),
    },
  ) {}

  async execute(cmd: CreateNeedCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    // A resource link must point to a resource in the SAME emergency (#60), or
    // any submitter could attach needs to foreign/cross-emergency resources.
    if (cmd.resourceId != null) {
      const ok = await this.resourceReader.existsInEmergency(
        cmd.resourceId,
        cmd.emergencyId,
      );
      if (!ok) throw new InvalidResourceLinkError(cmd.resourceId);
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
