export class UnauthorizedInventoryChangeError extends Error {
  constructor() {
    super('Not authorized to change the inventory of this resource');
    this.name = 'UnauthorizedInventoryChangeError';
  }
}
