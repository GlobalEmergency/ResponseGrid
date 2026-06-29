import { Injectable, Logger } from '@nestjs/common';
import {
  SetPasswordInvite,
  SetPasswordInviter,
} from '../domain/ports/set-password-inviter';

/**
 * No-op seam (#168): when a passwordless profile is created for an anonymous
 * donor, this is where the "set your password" email would be sent. The email
 * flow is not implemented yet, so this only logs the intent, keeping the
 * integration point visible. Swap for a real notifier when email lands.
 */
@Injectable()
export class NoopSetPasswordInviter implements SetPasswordInviter {
  private readonly logger = new Logger(NoopSetPasswordInviter.name);

  invite(invite: SetPasswordInvite): Promise<void> {
    this.logger.log(
      `TODO(email): invite ${invite.email} (user ${invite.userId}) to set their password`,
    );
    return Promise.resolve();
  }
}
