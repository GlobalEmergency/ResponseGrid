import { Logger } from '@nestjs/common';
import {
  DonorAccountInput,
  DonorAccountPort,
} from '../domain/ports/donor-account.port';
import { EnsureDonorAccount } from '../../identity/application/ensure-donor-account';

/**
 * Adapts the offers {@link DonorAccountPort} to identity's EnsureDonorAccount
 * use-case. Swallows errors into `null` so a failure to create/resolve a donor
 * profile (e.g. a malformed email) never breaks the donation pre-registration.
 */
export class IdentityDonorAccountAdapter implements DonorAccountPort {
  private readonly logger = new Logger(IdentityDonorAccountAdapter.name);

  constructor(private readonly ensureDonorAccount: EnsureDonorAccount) {}

  async ensureByContact(input: DonorAccountInput): Promise<string | null> {
    try {
      const { userId } = await this.ensureDonorAccount.execute({
        email: input.email,
        name: input.name,
        phone: input.phone,
      });
      return userId;
    } catch (err) {
      this.logger.warn(
        `Could not resolve a donor account for an intake: ${String(err)}`,
      );
      return null;
    }
  }
}
