export class DonationIntakeNotFoundError extends Error {
  constructor(id: string) {
    super(`Donation intake not found: ${id}`);
    this.name = 'DonationIntakeNotFoundError';
  }
}
