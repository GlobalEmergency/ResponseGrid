import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { FakeShipmentContainerPort } from '../infrastructure/fake-shipment-container-port';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentId } from '../domain/shipment-id';
import { CarrierType, ShipmentStatus } from '../domain/shipment-enums';
import { Category } from '../../supplies/domain/category';
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
  const { id } = await new CreateShipment(
    repo,
    new FakeStatusReader(),
    new FakeShipmentContainerPort(),
  ).execute({
    emergencyId: EM,
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    items: [
      { name: 'agua', quantity: 5, unit: null, category: Category.Water },
    ],
    containerIds: [],
    manifest: null,
  });
  return id;
}

describe('AssignCapacityToShipment', () => {
  it('assigns a capacity and carrier (planned → assigned)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    const useCase = new AssignCapacityToShipment(repo);

    await useCase.execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: { type: CarrierType.Organization, id: CARRIER_ID },
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.Assigned);
    expect(saved!.assignedCapacityId).toBe(CAPACITY);
    expect(saved!.carrier).toEqual({
      type: CarrierType.Organization,
      id: CARRIER_ID,
    });
  });

  it('assigns a capacity with no carrier (internal transfer)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    const useCase = new AssignCapacityToShipment(repo);

    await useCase.execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: null,
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.status).toBe(ShipmentStatus.Assigned);
    expect(saved!.carrier).toBeNull();
  });

  it('throws ShipmentNotFoundError for an unknown shipment', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new AssignCapacityToShipment(repo);

    await expect(
      useCase.execute({
        shipmentId: '99999999-9999-4999-8999-999999999999',
        assignedCapacityId: CAPACITY,
        carrier: null,
      }),
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('rejects a second assignment (assigned → assigned)', async () => {
    const repo = new InMemoryShipmentRepository();
    const id = await seedPlanned(repo);
    const useCase = new AssignCapacityToShipment(repo);
    await useCase.execute({
      shipmentId: id,
      assignedCapacityId: CAPACITY,
      carrier: null,
    });

    await expect(
      useCase.execute({
        shipmentId: id,
        assignedCapacityId: CAPACITY,
        carrier: null,
      }),
    ).rejects.toThrow(InvalidShipmentTransitionError);
  });
});
