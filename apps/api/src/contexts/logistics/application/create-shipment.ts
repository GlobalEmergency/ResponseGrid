import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { Shipment } from '../domain/shipment';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentItem, ShipmentItemProps } from '../domain/shipment-item';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const ACTIVE_STATUS = 'active';

export interface CreateShipmentCommand {
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  items: ShipmentItemProps[];
  manifest: string | null;
}

export class CreateShipment {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly emergencyStatusReader: LogisticsEmergencyStatusReader,
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
      items: cmd.items.map((i) => ShipmentItem.create(i)),
      manifest: cmd.manifest,
    });

    await this.repo.save(shipment);
    return { id: shipment.id.value };
  }
}
