import { ConfirmShipmentDelivery } from './confirm-shipment-delivery';
import { MarkShipmentInTransit } from './mark-shipment-in-transit';
import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { FakeShipmentEventBus } from '../infrastructure/fake-shipment-event-bus';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentId } from '../domain/shipment-id';
import { CarrierType, ShipmentStatus } from '../domain/shipment-enums';
import { ShipmentNotFoundError } from './shipment-not-found.error';
import { ShipmentActionUnauthorizedError } from './mark-shipment-in-transit';
import { InvalidShipmentTransitionError } from '../domain/shipment-errors';
import { ShipmentDelivered } from '../domain/events/shipment-delivered.event';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

async function seedInTransit(
  repo: InMemoryShipmentRepository,
): Promise<string> {
  const { id } = await new CreateShipment(repo, new FakeStatusReader()).execute(
    {
      emergencyId: EM,
      originResourceId: ORIGIN,
      destinationResourceId: DEST,
      items: [{ description: 'agua', quantity: 5 }],
      manifest: null,
    },
  );
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
  return id;
}

describe('ConfirmShipmentDelivery', () => {
  it('delivers (in_transit → delivered) and publishes ShipmentDelivered', async () => {
    const repo = new InMemoryShipmentRepository();
    const bus = new FakeShipmentEventBus();
    const id = await seedInTransit(repo);
    const useCase = new ConfirmShipmentDelivery(repo, bus);

    await useCase.execute({
      shipmentId: id,
      requesterUserId: CARRIER_ID,
      isCoordinator: false,
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.Delivered);

    expect(bus.published).toHaveLength(1);
    const evt = bus.published[0] as ShipmentDelivered;
    expect(evt).toBeInstanceOf(ShipmentDelivered);
    expect(evt.eventName).toBe('shipment.delivered');
    expect(evt.payload).toMatchObject({
      emergencyId: EM,
      destinationResourceId: DEST,
      carrierId: CARRIER_ID,
    });
  });

  it('rejects a non-carrier non-coordinator', async () => {
    const repo = new InMemoryShipmentRepository();
    const bus = new FakeShipmentEventBus();
    const id = await seedInTransit(repo);
    const useCase = new ConfirmShipmentDelivery(repo, bus);

    await expect(
      useCase.execute({
        shipmentId: id,
        requesterUserId: OTHER_USER,
        isCoordinator: false,
      }),
    ).rejects.toThrow(ShipmentActionUnauthorizedError);
    expect(bus.published).toHaveLength(0);
  });

  it('throws ShipmentNotFoundError for an unknown shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const bus = new FakeShipmentEventBus();
    const useCase = new ConfirmShipmentDelivery(repo, bus);

    await expect(
      useCase.execute({
        shipmentId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: CARRIER_ID,
        isCoordinator: true,
      }),
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('rejects delivering a shipment that is not in transit', async () => {
    const repo = new InMemoryShipmentRepository();
    const bus = new FakeShipmentEventBus();
    // assigned but never marked in_transit
    const { id } = await new CreateShipment(
      repo,
      new FakeStatusReader(),
    ).execute({
      emergencyId: EM,
      originResourceId: ORIGIN,
      destinationResourceId: DEST,
      items: [{ description: 'agua', quantity: 5 }],
      manifest: null,
    });
    await new AssignCapacityToShipment(repo).execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: { type: CarrierType.Volunteer, id: CARRIER_ID },
    });
    const useCase = new ConfirmShipmentDelivery(repo, bus);

    await expect(
      useCase.execute({
        shipmentId: id,
        requesterUserId: CARRIER_ID,
        isCoordinator: false,
      }),
    ).rejects.toThrow(InvalidShipmentTransitionError);
    expect(bus.published).toHaveLength(0);
  });
});
