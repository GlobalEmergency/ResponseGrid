import {
  LoadContainersOntoShipmentCommand,
  MoveContainersToResourceCommand,
  ShipmentContainerPort,
} from '../domain/ports/shipment-container-port';

/**
 * In-memory {@link ShipmentContainerPort} for application tests: records the
 * load/move calls and can be primed to reject, without touching the supplies
 * Container aggregate.
 */
export class FakeShipmentContainerPort implements ShipmentContainerPort {
  readonly loaded: LoadContainersOntoShipmentCommand[] = [];
  readonly moved: MoveContainersToResourceCommand[] = [];
  loadError: Error | null = null;

  loadOntoShipment(cmd: LoadContainersOntoShipmentCommand): Promise<void> {
    if (this.loadError !== null) return Promise.reject(this.loadError);
    this.loaded.push(cmd);
    return Promise.resolve();
  }

  moveContainersToResource(
    cmd: MoveContainersToResourceCommand,
  ): Promise<void> {
    this.moved.push(cmd);
    return Promise.resolve();
  }
}
