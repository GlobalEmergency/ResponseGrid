export class DonationIntakeAlreadyProcessedError extends Error {
  constructor(status: string) {
    super(`Donation intake is already processed (status: '${status}')`);
    this.name = 'DonationIntakeAlreadyProcessedError';
  }
}

export class InvalidDonationIntakeTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid donation intake transition from '${from}' to '${to}'`);
    this.name = 'InvalidDonationIntakeTransitionError';
  }
}

export class InvalidDonationIntakeContactError extends Error {
  constructor() {
    super('At least one of donorPhone or donorEmail is required');
    this.name = 'InvalidDonationIntakeContactError';
  }
}

export class InvalidIntakeTargetResourceError extends Error {
  constructor(resourceId: string, reason: string) {
    super(`Resource '${resourceId}' is not a valid intake target: ${reason}`);
    this.name = 'InvalidIntakeTargetResourceError';
  }
}

export class DonationIntakeContactMismatchError extends Error {
  constructor() {
    super('Contact does not match the donation intake record');
    this.name = 'DonationIntakeContactMismatchError';
  }
}

export class DonationIntakeLineLimitError extends Error {
  constructor(limit: number) {
    super(`Donation intake cannot exceed ${limit} lines`);
    this.name = 'DonationIntakeLineLimitError';
  }
}

export class DonationIntakeReceptionReasonRequiredError extends Error {
  constructor() {
    super(
      'A reason is required when the received lines differ from the declared ones',
    );
    this.name = 'DonationIntakeReceptionReasonRequiredError';
  }
}
