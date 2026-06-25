import { User } from './user';
import { UserId } from './user-id';
import { Email } from './email';

describe('User', () => {
  const id = UserId.fromString('11111111-1111-4111-8111-111111111111');
  const email = Email.fromString('admin@reliefhub.org');

  it('creates a user via User.create', () => {
    const user = User.create({ id, email, passwordHash: 'hash', name: 'Admin', isAdmin: true });
    expect(user.id.value).toBe(id.value);
    expect(user.email.value).toBe(email.value);
    expect(user.passwordHash).toBe('hash');
    expect(user.name).toBe('Admin');
    expect(user.isAdmin).toBe(true);
  });

  it('round-trips through snapshot', () => {
    const user = User.create({ id, email, passwordHash: 'hash', name: 'Admin', isAdmin: false });
    const restored = User.fromSnapshot(user.toSnapshot());
    expect(restored.id.value).toBe(user.id.value);
    expect(restored.email.value).toBe(user.email.value);
    expect(restored.name).toBe(user.name);
    expect(restored.isAdmin).toBe(false);
  });
});
