import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentStatus } from '../domain/shipment-enums';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { ShipmentMustHaveItemsError } from '../domain/shipment-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

class FakeStatusReader implements LogisticsEmergencyStatusReader {
  constructor(private status: string | null) {}
  getStatus(): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

function baseCmd() {
  return {
    emergencyId: EM,
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    items: [{ description: '5 cajas de agua', quantity: 5 }],
    manifest: 'Agua potable',
  };
}

describe('CreateShipment', () => {
  it('creates a planned shipment when the emergency is active', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new CreateShipment(repo, new FakeStatusReader('active'));

    const { id } = await useCase.execute(baseCmd());

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(ShipmentStatus.Planned);
    expect(saved!.assignedCapacityId).toBeNull();
    expect(saved!.carrier).toBeNull();
    expect(saved!.items[0].description).toBe('5 cajas de agua');
  });

  it('rejects creation in a paused emergency', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new CreateShipment(repo, new FakeStatusReader('paused'));

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('rejects creation in a non-existent emergency', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new CreateShipment(repo, new FakeStatusReader(null));

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('propagates the domain invariant when there are no items', async () => {
    const repo = new InMemoryShipmentRepository();
    const useCase = new CreateShipment(repo, new FakeStatusReader('active'));

    await expect(useCase.execute({ ...baseCmd(), items: [] })).rejects.toThrow(
      ShipmentMustHaveItemsError,
    );
  });
});
