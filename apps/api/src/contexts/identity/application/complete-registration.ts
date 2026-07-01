import { UserRepository } from '../domain/ports/user.repository';
import { ConsentRepository } from '../domain/ports/consent.repository';
import { UserId } from '../domain/user-id';
import { User } from '../domain/user';
import { UserNotFoundError } from '../domain/user-not-found.error';
import { ConsentRequiredError } from '../domain/consent-required.error';
import { PhoneRequiredError } from '../domain/phone-required.error';
import { CURRENT_CONSENT_VERSIONS, missingConsents } from '../domain/consent';

export interface CompleteRegistrationCommand {
  userId: string;
  phone: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  /** Request IP at acceptance (audit); optional. */
  ip?: string | null;
  /** Request User-Agent at acceptance (audit); optional. */
  userAgent?: string | null;
}

export interface CompleteRegistrationResult {
  profileComplete: true;
}

/**
 * Onboarding step for accounts created without phone/consent — i.e. social
 * (Google/Facebook) logins. Requires accepting both legal documents and a
 * contact phone, then persists the phone and appends the missing consent rows.
 */
export class CompleteRegistration {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly consentRepo: ConsentRepository,
  ) {}

  async execute(
    cmd: CompleteRegistrationCommand,
  ): Promise<CompleteRegistrationResult> {
    if (!cmd.acceptedTerms || !cmd.acceptedPrivacy) {
      throw new ConsentRequiredError();
    }
    const phone = cmd.phone?.trim() ?? '';
    if (phone === '') throw new PhoneRequiredError();

    const userId = UserId.fromString(cmd.userId);
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UserNotFoundError(cmd.userId);

    const updated = User.fromSnapshot({ ...user.toSnapshot(), phone });
    await this.userRepo.save(updated);

    // Only append consents the user has not already accepted at current version,
    // so re-running onboarding does not create duplicate rows.
    const existing = await this.consentRepo.findByUser(userId);
    const toRecord = missingConsents(existing).map((document) => ({
      document,
      version: CURRENT_CONSENT_VERSIONS[document],
    }));
    if (toRecord.length > 0) {
      await this.consentRepo.record(userId, toRecord, {
        ip: cmd.ip ?? null,
        userAgent: cmd.userAgent ?? null,
      });
    }

    return { profileComplete: true };
  }
}
