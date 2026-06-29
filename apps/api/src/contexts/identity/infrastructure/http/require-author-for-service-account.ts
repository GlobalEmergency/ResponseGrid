import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt-auth.guard';

/**
 * The `author` block is the unlock for a delegated write: a service account
 * (API key) may create a need / offer / resource on behalf of a third party
 * ONLY when it carries that person's contact in `author` (issue #235:
 * "api-key + grant + author → permitido"). Human users are unaffected — they
 * are the author implicitly, so `author` stays optional for them.
 *
 * Call from a create handler after the body is validated. Throws 400 when a
 * service-account principal omitted `author`.
 */
export function requireAuthorForServiceAccount(
  user: Pick<AuthenticatedUser, 'isServiceAccount'> | undefined,
  author: unknown,
): void {
  if (user?.isServiceAccount && (author === undefined || author === null)) {
    throw new BadRequestException(
      'author is required when a service account creates a record on behalf of a third party',
    );
  }
}
