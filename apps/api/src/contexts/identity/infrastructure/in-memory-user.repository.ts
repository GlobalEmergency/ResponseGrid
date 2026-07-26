import { UserRepository } from '../domain/ports/user.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { normalizePhone } from '../domain/phone-normalization';

export class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, ReturnType<User['toSnapshot']>>();
  private lastLoginById = new Map<string, Date>();

  save(user: User): Promise<void> {
    this.store.set(user.id.value, user.toSnapshot());
    return Promise.resolve();
  }

  findByEmail(email: Email): Promise<User | null> {
    const snap = [...this.store.values()].find((s) => s.email === email.value);
    return Promise.resolve(snap ? User.fromSnapshot(snap) : null);
  }

  findByPhone(phone: string): Promise<User[]> {
    const digits = normalizePhone(phone);
    if (digits === '') return Promise.resolve([]);
    // Insertion order approximates recency; reverse → most recent first.
    const matches = [...this.store.values()]
      .filter((s) => s.phone !== null && normalizePhone(s.phone) === digits)
      .reverse()
      .map((s) => User.fromSnapshot(s));
    return Promise.resolve(matches);
  }

  findById(id: UserId): Promise<User | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? User.fromSnapshot(snap) : null);
  }

  setPassword(id: UserId, passwordHash: string): Promise<void> {
    const snap = this.store.get(id.value);
    if (snap) this.store.set(id.value, { ...snap, passwordHash });
    return Promise.resolve();
  }

  /** Records when the user last logged in (issue #176). */
  recordLogin(id: UserId): Promise<void> {
    this.lastLoginById.set(id.value, new Date());
    return Promise.resolve();
  }

  /** Test helper — returns the recorded last-login instant, if any. */
  lastLoginOf(id: UserId): Date | undefined {
    return this.lastLoginById.get(id.value);
  }

  /** Test helper — returns the total number of stored users. */
  countAll(): Promise<number> {
    return Promise.resolve(this.store.size);
  }
}
