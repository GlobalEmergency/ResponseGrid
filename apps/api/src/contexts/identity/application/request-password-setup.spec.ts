import { RequestPasswordSetup } from './request-password-setup';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import {
  SetPasswordInvite,
  SetPasswordInviter,
} from '../domain/ports/set-password-inviter';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';

class RecordingInviter implements SetPasswordInviter {
  readonly invites: SetPasswordInvite[] = [];
  invite(invite: SetPasswordInvite): Promise<void> {
    this.invites.push(invite);
    return Promise.resolve();
  }
}

describe('RequestPasswordSetup', () => {
  let users: InMemoryUserRepository;
  let inviter: RecordingInviter;
  let request: RequestPasswordSetup;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    inviter = new RecordingInviter();
    request = new RequestPasswordSetup(users, inviter);
  });

  async function saveUser(email: string, passwordHash: string | null) {
    await users.save(
      User.create({
        id: UserId.create(),
        email: Email.fromString(email),
        passwordHash,
        name: 'Donante',
        isAdmin: false,
      }),
    );
  }

  it('invites a passwordless profile', async () => {
    await saveUser('donor@example.com', null);
    await request.execute({ email: 'donor@example.com' });
    expect(inviter.invites).toHaveLength(1);
    expect(inviter.invites[0].email).toBe('donor@example.com');
  });

  it('does not invite an account that already has a password', async () => {
    await saveUser('member@example.com', 'existing-hash');
    await request.execute({ email: 'member@example.com' });
    expect(inviter.invites).toHaveLength(0);
  });

  it('is a silent no-op for an unknown email (no enumeration signal)', async () => {
    await request.execute({ email: 'nobody@example.com' });
    expect(inviter.invites).toHaveLength(0);
  });

  it('is a silent no-op for a malformed email', async () => {
    await request.execute({ email: 'not-an-email' });
    expect(inviter.invites).toHaveLength(0);
  });
});
