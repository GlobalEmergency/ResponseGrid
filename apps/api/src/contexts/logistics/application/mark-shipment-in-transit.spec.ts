import {
  MarkShipmentInTransit,
  ShipmentActionUnauthorizedError,
} from './mark-shipment-in-transit';
import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
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
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

async function seedAssigned(
  repo: InMemoryShipmentRepository,
  carrierId: string | null,
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
    carrier: carrierId ? { type: CarrierType.Volunteer, id: carrierId } : null,
  });
  return id;
}

describe('MarkShipmentInTransit', () => {
  it('lets the assigned carrier start the run (assigned → in_transit)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedAssigned(repo, CARRIER_ID);
    const useCase = new MarkShipmentInTransit(repo);

    await useCase.execute({
      shipmentId: id,
      requesterUserId: CARRIER_ID,
      isCoordinator: false,
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.InTransit);
  });

  it('lets a coordinator start the run on an internal transfer (no carrier)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedAssigned(repo, null);
    const useCase = new MarkShipmentInTransit(repo);

    await useCase.execute({
      shipmentId: id,
      requesterUserId: OTHER_USER,
      isCoordinator: true,
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.InTransit);
  });

  it('rejects a non-carrier non-coordinator', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedAssigned(repo, CARRIER_ID);
    const useCase = new MarkShipmentInTransit(repo);

    await expect(
      useCase.execute({
        shipmentId: id,
        requesterUserId: OTHER_USER,
        isCoordinator: false,
      }),
    ).rejects.toThrow(ShipmentActionUnauthorizedError);
  });

  it('throws ShipmentNotFoundError for an unknown shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new MarkShipmentInTransit(repo);

    await expect(
      useCase.execute({
        shipmentId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: CARRIER_ID,
        isCoordinator: true,
      }),
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('rejects starting a still-planned shipment (domain invariant)', async () => {
    const repo = new InMemoryShipmentRepository();
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
    const useCase = new MarkShipmentInTransit(repo);

    await expect(
      useCase.execute({
        shipmentId: id,
        requesterUserId: CARRIER_ID,
        isCoordinator: true,
      }),
    ).rejects.toThrow(InvalidShipmentTransitionError);
  });
});
