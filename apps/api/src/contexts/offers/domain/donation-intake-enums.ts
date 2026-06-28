export enum DonationIntakeStatus {
  Pending = 'pending',
  Received = 'received',
  Rejected = 'rejected',
  Incomplete = 'incomplete',
}

/** Límite técnico anti-abuso — sin tope de negocio para el donante. */
export const MAX_DONATION_INTAKE_LINES = 100;
