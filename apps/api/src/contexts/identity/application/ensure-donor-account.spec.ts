import { EnsureDonorAccount } from './ensure-donor-account';
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

describe('EnsureDonorAccount', () => {
  let users: InMemoryUserRepository;
  let inviter: RecordingInviter;
  let ensure: EnsureDonorAccount;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    inviter = new RecordingInviter();
    ensure = new EnsureDonorAccount(users, inviter);
  });

  it('creates a passwordless profile and fires the invite for a new email', async () => {
    const res = await ensure.execute({
      email: 'donor@example.com',
      name: 'Donante',
      phone: '+58 412 555 0101',
    });

    expect(res.created).toBe(true);
    const user = await users.findByEmail(Email.fromString('donor@example.com'));
    expect(user).not.toBeNull();
    expect(user!.id.value).toBe(res.userId);
    expect(user!.passwordHash).toBeNull();
    expect(user!.name).toBe('Donante');
    expect(user!.phone).toBe('+58 412 555 0101');
    expect(user!.isAdmin).toBe(false);
    expect(inviter.invites).toEqual([
      { userId: res.userId, email: 'donor@example.com', name: 'Donante' },
    ]);
  });

  it('returns the existing user without creating or inviting for a known email', async () => {
    const existing = User.create({
      id: UserId.create(),
      email: Email.fromString('donor@example.com'),
      passwordHash: 'hash',
      name: 'Existing',
      isAdmin: false,
    });
    await users.save(existing);

    const res = await ensure.execute({
      email: 'donor@example.com',
      name: 'Donante',
      phone: '123',
    });

    expect(res).toEqual({ userId: existing.id.value, created: false });
    expect(inviter.invites).toHaveLength(0);
    expect(await users.countAll()).toBe(1);
  });
});
