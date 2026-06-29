import { CreateShipment } from './create-shipment';
import { InMemoryShipmentRepository } from '../infrastructure/in-memory-shipment.repository';
import { FakeShipmentContainerPort } from '../infrastructure/fake-shipment-container-port';
import { LogisticsEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentStatus } from '../domain/shipment-enums';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category } from '../../supplies/domain/category';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { ShipmentMustHaveCargoError } from '../domain/shipment-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CONTAINER_A = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    items: [
      { name: 'Agua', quantity: 5, unit: null, category: Category.Water },
    ],
    containerIds: [] as string[],
    manifest: 'Agua potable',
  };
}

function makeUseCase(
  repo: InMemoryShipmentRepository,
  status: string | null,
  port = new FakeShipmentContainerPort(),
): { useCase: CreateShipment; port: FakeShipmentContainerPort } {
  return {
    useCase: new CreateShipment(repo, new FakeStatusReader(status), port),
    port,
  };
}

describe('CreateShipment', () => {
  it('creates a planned shipment when the emergency is active', async () => {
    const repo = new InMemoryShipmentRepository();
    const { useCase } = makeUseCase(repo, 'active');

    const { id } = await useCase.execute(baseCmd());

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(ShipmentStatus.Planned);
    expect(saved!.assignedCapacityId).toBeNull();
    expect(saved!.carrier).toBeNull();
    expect(saved!.items[0].name).toBe('Agua');
  });

  it('rejects creation in a paused emergency', async () => {
    const repo = new InMemoryShipmentRepository();
    const { useCase } = makeUseCase(repo, 'paused');

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('rejects creation in a non-existent emergency', async () => {
    const repo = new InMemoryShipmentRepository();
    const { useCase } = makeUseCase(repo, null);

    await expect(useCase.execute(baseCmd())).rejects.toThrow(
      EmergencyNotAcceptingIntakeError,
    );
  });

  it('propagates the domain invariant when there is no cargo', async () => {
    const repo = new InMemoryShipmentRepository();
    const { useCase } = makeUseCase(repo, 'active');

    await expect(
      useCase.execute({ ...baseCmd(), items: [], containerIds: [] }),
    ).rejects.toThrow(ShipmentMustHaveCargoError);
  });

  it('loads the declared containers onto the shipment (holder = shipment)', async () => {
    const repo = new InMemoryShipmentRepository();
    const { useCase, port } = makeUseCase(repo, 'active');

    const { id } = await useCase.execute({
      ...baseCmd(),
      items: [],
      containerIds: [CONTAINER_A],
    });

    const saved = await repo.findById(ShipmentId.fromString(id));
    expect(saved!.containerIds).toEqual([CONTAINER_A]);
    expect(port.loaded).toHaveLength(1);
    expect(port.loaded[0]).toEqual({
      emergencyId: EM,
      shipmentId: id,
      containerIds: [CONTAINER_A],
    });
  });

  it('does not persist the shipment when loading containers fails', async () => {
    const repo = new InMemoryShipmentRepository();
    const port = new FakeShipmentContainerPort();
    port.loadError = new Error('container unavailable');
    const { useCase } = makeUseCase(repo, 'active', port);

    await expect(
      useCase.execute({ ...baseCmd(), containerIds: [CONTAINER_A] }),
    ).rejects.toThrow('container unavailable');

    const all = await repo.findByEmergency(EmergencyId.fromString(EM), {});
    expect(all).toHaveLength(0);
  });
});
