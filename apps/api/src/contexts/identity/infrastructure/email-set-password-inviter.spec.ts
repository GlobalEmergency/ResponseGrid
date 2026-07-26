import { EmailSetPasswordInviter } from './email-set-password-inviter';
import { InMemoryPasswordSetupTokenRepository } from './in-memory-password-setup-token.repository';
import { EmailMessage, EmailSender } from '../domain/ports/email-sender';
import { hashSetupToken } from '../domain/password-setup-token-generator';

class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('EmailSetPasswordInviter', () => {
  let tokens: InMemoryPasswordSetupTokenRepository;
  let email: RecordingEmailSender;
  let inviter: EmailSetPasswordInviter;
  const now = new Date('2026-07-17T12:00:00Z');

  beforeEach(() => {
    tokens = new InMemoryPasswordSetupTokenRepository();
    email = new RecordingEmailSender();
    inviter = new EmailSetPasswordInviter(
      tokens,
      email,
      {
        ttlHours: 48,
        frontendUrl: 'https://responsegrid.app/',
        setPasswordPath: '/crear-contrasena',
      },
      () => now,
    );
  });

  it('persists only a token hash and emails a link with the raw token', async () => {
    await inviter.invite({
      userId: USER_ID,
      email: 'donor@example.com',
      name: 'Ana',
    });

    expect(email.sent).toHaveLength(1);
    const sent = email.sent[0];
    expect(sent.to).toBe('donor@example.com');

    // Pull the raw token out of the link, then confirm the stored value is its
    // hash — never the raw token itself.
    const match = /token=([^&\s"]+)/.exec(sent.text);
    expect(match).not.toBeNull();
    const rawToken = decodeURIComponent(match![1]);

    const stored = await tokens.findByHash(hashSetupToken(rawToken));
    expect(stored).not.toBeNull();
    expect(stored!.userId).toBe(USER_ID);
    expect(stored!.tokenHash).not.toBe(rawToken);
    expect(stored!.isUsable(now)).toBe(true);
    // 48h expiry from the injected clock.
    expect(stored!.expiresAt).toEqual(new Date('2026-07-19T12:00:00Z'));
  });

  it('builds the link from the frontend origin without a double slash', async () => {
    await inviter.invite({
      userId: USER_ID,
      email: 'donor@example.com',
      name: 'Ana',
    });
    expect(email.sent[0].text).toContain(
      'https://responsegrid.app/crear-contrasena?token=',
    );
  });
});
