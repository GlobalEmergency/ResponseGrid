export class EmergencyNotAcceptingIntakeError extends Error {
  constructor(emergencyId: string, status: string) {
    super(
      `Emergency '${emergencyId}' is not accepting intake (status: '${status}')`,
    );
    this.name = 'EmergencyNotAcceptingIntakeError';
  }
}
