import { randomUUID } from 'node:crypto';
import {
  SetPasswordInvite,
  SetPasswordInviter,
} from '../domain/ports/set-password-inviter';
import { PasswordSetupTokenRepository } from '../domain/ports/password-setup-token.repository';
import { EmailSender } from '../domain/ports/email-sender';
import { PasswordSetupToken } from '../domain/password-setup-token';
import { generateSetupToken } from '../domain/password-setup-token-generator';
import { renderSetPasswordEmail } from './set-password-email';

export interface EmailSetPasswordInviterConfig {
  /** Hours a set-password link stays valid. */
  ttlHours: number;
  /** Web origin used to build the set-password link (no trailing slash needed). */
  frontendUrl: string;
  /** Path of the web set-password page. */
  setPasswordPath: string;
}

/**
 * Real {@link SetPasswordInviter} (#204, replaces the no-op seam): mints a
 * single-use, expiring token, persists ONLY its hash, and emails the donor a
 * link to set their password. The raw token lives only in the email.
 */
export class EmailSetPasswordInviter implements SetPasswordInviter {
  constructor(
    private readonly tokens: PasswordSetupTokenRepository,
    private readonly email: EmailSender,
    private readonly config: EmailSetPasswordInviterConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async invite(invite: SetPasswordInvite): Promise<void> {
    const { plaintext, hash } = generateSetupToken();
    const now = this.clock();
    const expiresAt = new Date(
      now.getTime() + this.config.ttlHours * 60 * 60 * 1000,
    );

    await this.tokens.save(
      PasswordSetupToken.issue({
        id: randomUUID(),
        userId: invite.userId,
        tokenHash: hash,
        expiresAt,
        createdAt: now,
      }),
    );

    const origin = this.config.frontendUrl.replace(/\/+$/, '');
    const path = this.config.setPasswordPath.startsWith('/')
      ? this.config.setPasswordPath
      : `/${this.config.setPasswordPath}`;
    const link = `${origin}${path}?token=${encodeURIComponent(plaintext)}`;

    await this.email.send(
      renderSetPasswordEmail({
        to: invite.email,
        name: invite.name,
        link,
      }),
    );
  }
}
