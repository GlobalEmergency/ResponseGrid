export class InvalidEmergencyTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition emergency from '${from}' to '${to}'`);
    this.name = 'InvalidEmergencyTransitionError';
  }
}
