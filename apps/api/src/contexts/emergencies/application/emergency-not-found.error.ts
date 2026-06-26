export class EmergencyNotFoundError extends Error {
  constructor(id: string) {
    super(`Emergency not found: ${id}`);
    this.name = 'EmergencyNotFoundError';
  }
}
