export class ShipmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Shipment not found: ${id}`);
    this.name = 'ShipmentNotFoundError';
  }
}
