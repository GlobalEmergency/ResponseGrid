import { OfferRepository } from '../domain/ports/offer.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';
import { DonationOffer } from '../domain/donation-offer';
import { OfferId } from '../domain/offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category } from '../domain/offer-enums';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { Location } from '../../../shared/domain/location';
import { Author, AuthorProps } from '../../../shared/domain/author';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export class TargetNeedNotFoundError extends Error {
  constructor(needId: string) {
    super(`Target need not found: ${needId}`);
    this.name = 'TargetNeedNotFoundError';
  }
}

export class TargetNeedWrongEmergencyError extends Error {
  constructor(needId: string, emergencyId: string) {
    super(
      `Target need '${needId}' does not belong to emergency '${emergencyId}'`,
    );
    this.name = 'TargetNeedWrongEmergencyError';
  }
}

export interface SubmitOfferLocationCommand {
  address: string;
  latitude: number;
  longitude: number;
}

export interface SubmitOfferItemCommand {
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
  presentation: string | null;
}

export interface SubmitOfferCommand {
  emergencyId: string;
  donorUserId: string;
  donorOrganizationId: string | null;
  items: SubmitOfferItemCommand[];
  location: SubmitOfferLocationCommand;
  targetNeedId: string | null;
  notes: string | null;
  /** Optional restricted author attribution (#235). */
  author?: AuthorProps | null;
}

export class SubmitOffer {
  constructor(
    private readonly repo: OfferRepository,
    private readonly bus: EventBus,
    private readonly emergencyStatusReader: OfferEmergencyStatusReader,
    private readonly needLookup: NeedLookup,
  ) {}

  async execute(cmd: SubmitOfferCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    if (cmd.targetNeedId !== null) {
      const needEmergencyId = await this.needLookup.findEmergencyId(
        cmd.targetNeedId,
      );
      if (needEmergencyId === null) {
        throw new TargetNeedNotFoundError(cmd.targetNeedId);
      }
      if (needEmergencyId !== cmd.emergencyId) {
        throw new TargetNeedWrongEmergencyError(
          cmd.targetNeedId,
          cmd.emergencyId,
        );
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
        presentation: i.presentation,
      }),
    );

    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      donorUserId: cmd.donorUserId,
      donorOrganizationId: cmd.donorOrganizationId,
      items,
      location,
      targetNeedId: cmd.targetNeedId,
      notes: cmd.notes,
      author: cmd.author ? Author.create(cmd.author) : null,
    });

    await this.repo.save(offer);
    await this.bus.publish(offer.pullDomainEvents());
    return { id: offer.id.value };
  }
}
