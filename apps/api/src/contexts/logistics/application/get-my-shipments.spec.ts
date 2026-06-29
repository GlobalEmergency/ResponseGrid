import { GetMyShipments } from './get-my-shipments';
import { AssignCapacityToShipment } from './assign-capacity-to-shipment';
import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { FakeShipmentContainerPort } from '../infrastructure/fake-shipment-container-port';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { CarrierType } from '../domain/shipment-enums';
import { Category } from '../../supplies/domain/category';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_CARRIER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

async function createAssigned(
  repo: InMemoryShipmentRepository,
  emergencyId: string,
  carrierId: string,
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
  await new AssignCapacityToShipment(repo).execute({
    shipmentId: id,
    assignedCapacityId: CAPACITY,
    carrier: { type: CarrierType.Volunteer, id: carrierId },
  });
  return id;
}

describe('GetMyShipments', () => {
  it('returns only shipments assigned to the carrier (across emergencies)', async () => {
    const repo = new InMemoryShipmentRepository();
    await createAssigned(repo, EM, CARRIER_ID);
    await createAssigned(repo, OTHER_EM, CARRIER_ID);
    await createAssigned(repo, EM, OTHER_CARRIER);
    const useCase = new GetMyShipments(repo);

    const result = await useCase.execute({
      carrierId: CARRIER_ID,
      emergencyId: null,
    });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.carrierId === CARRIER_ID)).toBe(true);
  });

  it('scopes to one emergency when given', async () => {
    const repo = new InMemoryShipmentRepository();
    await createAssigned(repo, EM, CARRIER_ID);
    await createAssigned(repo, OTHER_EM, CARRIER_ID);
    const useCase = new GetMyShipments(repo);

    const result = await useCase.execute({
      carrierId: CARRIER_ID,
      emergencyId: EM,
    });
    expect(result).toHaveLength(1);
    expect(result[0].emergencyId).toBe(EM);
  });

  it('returns nothing for a carrier with no shipments', async () => {
    const repo = new InMemoryShipmentRepository();
    await createAssigned(repo, EM, OTHER_CARRIER);
    const useCase = new GetMyShipments(repo);

    const result = await useCase.execute({
      carrierId: CARRIER_ID,
      emergencyId: null,
    });
    expect(result).toHaveLength(0);
  });
});
