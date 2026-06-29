import { ListShipments } from './list-shipments';
import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { FakeShipmentContainerPort } from '../infrastructure/fake-shipment-container-port';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { CarrierType, ShipmentStatus } from '../domain/shipment-enums';
import { Category } from '../../supplies/domain/category';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

async function create(
  repo: InMemoryShipmentRepository,
  emergencyId: string,
): Promise<string> {
  const { id } = await new CreateShipment(
    repo,
    new FakeStatusReader(),
    new FakeShipmentContainerPort(),
  ).execute({
    emergencyId,
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

describe('ListShipments', () => {
  it('lists shipments of an emergency, newest first', async () => {
    const repo = new InMemoryShipmentRepository();
    await create(repo, EM);
    await create(repo, EM);
    await create(repo, OTHER_EM);
    const useCase = new ListShipments(repo);

    const result = await useCase.execute({ emergencyId: EM });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.emergencyId === EM)).toBe(true);
  });

  it('filters by status', async () => {
    const repo = new InMemoryShipmentRepository();
    await create(repo, EM); // planned
    const assignedId = await create(repo, EM);
    await new AssignCapacityToShipment(repo).execute({
      shipmentId: assignedId,
      assignedCapacityId: CAPACITY,
      carrier: { type: CarrierType.Volunteer, id: CARRIER_ID },
    });
    const useCase = new ListShipments(repo);

    const planned = await useCase.execute({
      emergencyId: EM,
      status: ShipmentStatus.Planned,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0].status).toBe(ShipmentStatus.Planned);

    const assigned = await useCase.execute({
      emergencyId: EM,
      status: ShipmentStatus.Assigned,
    });
    expect(assigned).toHaveLength(1);
    expect(assigned[0].id).toBe(assignedId);
  });
});
