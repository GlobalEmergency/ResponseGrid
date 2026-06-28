export class CapacityNotFoundError extends Error {
  constructor(id: string) {
    super(`Transport capacity not found: ${id}`);
    this.name = 'CapacityNotFoundError';
  }
}
