/** Raised when a container id does not resolve. The HTTP layer maps it to 404. */
export class ContainerNotFoundError extends Error {
  constructor(containerId: string) {
    super(`Container ${containerId} not found`);
    this.name = 'ContainerNotFoundError';
  }
}
