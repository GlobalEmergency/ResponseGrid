import { CancelShipment } from './cancel-shipment';
import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
import { MarkShipmentInTransit } from './mark-shipment-in-transit';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentId } from '../domain/shipment-id';
import { CarrierType, ShipmentStatus } from '../domain/shipment-enums';
import { ShipmentNotFoundError } from './shipment-not-found.error';
import { InvalidShipmentTransitionError } from '../domain/shipment-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

async function seedPlanned(repo: InMemoryShipmentRepository): Promise<string> {
  const { id } = await new CreateShipment(repo, new FakeStatusReader()).execute(
    {
      emergencyId: EM,
      originResourceId: ORIGIN,
      destinationResourceId: DEST,
      items: [{ description: 'agua', quantity: 5 }],
      manifest: null,
    },
  );
  return id;
}

describe('CancelShipment', () => {
  it('cancels a planned shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    const useCase = new CancelShipment(repo);

    await useCase.execute({ shipmentId: id });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.Cancelled);
  });

  it('cancels an assigned shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    await new AssignCapacityToShipment(repo).execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: { type: CarrierType.Volunteer, id: CARRIER_ID },
    });
    const useCase = new CancelShipment(repo);

    await useCase.execute({ shipmentId: id });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.Cancelled);
  });

  it('throws ShipmentNotFoundError for an unknown shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new CancelShipment(repo);

    await expect(
      useCase.execute({ shipmentId: '99999999-9999-4999-8999-999999999999' }),
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('rejects cancelling a shipment already in transit (domain invariant)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    await new AssignCapacityToShipment(repo).execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: { type: CarrierType.Volunteer, id: CARRIER_ID },
    });
    await new MarkShipmentInTransit(repo).execute({
      shipmentId: id,
      requesterUserId: CARRIER_ID,
      isCoordinator: false,
    });
    const useCase = new CancelShipment(repo);

    await expect(useCase.execute({ shipmentId: id })).rejects.toThrow(
      InvalidShipmentTransitionError,
    );
  });
});
