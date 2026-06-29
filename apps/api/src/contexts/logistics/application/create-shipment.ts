import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentContainerPort } from '../domain/ports/shipment-container-port';
import { Shipment } from '../domain/shipment';
import { ShipmentId } from '../domain/shipment-id';
import { SupplyLine, SupplyLineProps } from '../../supplies/domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export interface CreateShipmentCommand {
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  /** Loose cargo lines (canonical SupplyLine). May be empty if containers move. */
  items: SupplyLineProps[];
  /** Trackable containers (#140) loaded onto the expedition. May be empty. */
  containerIds: string[];
  manifest: string | null;
}

export class CreateShipment {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly emergencyStatusReader: LogisticsEmergencyStatusReader,
    private readonly containerPort: ShipmentContainerPort,
  ) {}

  async execute(cmd: CreateShipmentCommand): Promise<{ id: string }> {
    const status = await this.emergencyStatusReader.getStatus(cmd.emergencyId);
    if (status !== ACTIVE_STATUS) {
      throw new EmergencyNotAcceptingIntakeError(
        cmd.emergencyId,
        status ?? 'not-found',
      );
    }

    const shipment = Shipment.create({
      id: ShipmentId.create(),
      emergencyId: EmergencyId.fromString(cmd.emergencyId),
      originResourceId: cmd.originResourceId,
      destinationResourceId: cmd.destinationResourceId,
      items: cmd.items.map((i) => SupplyLine.create(i)),
      containerIds: cmd.containerIds,
      manifest: cmd.manifest,
    });

    // Load the containers first (holder = shipment): validation is
    // all-or-nothing, so an unknown/foreign/busy container fails BEFORE any
    // shipment row is created — no orphan shipment, no moved containers.
    if (shipment.containerIds.length > 0) {
      await this.containerPort.loadOntoShipment({
        emergencyId: cmd.emergencyId,
        shipmentId: shipment.id.value,
        containerIds: shipment.containerIds,
      });
    }

    await this.repo.save(shipment);
    return { id: shipment.id.value };
  }
}
