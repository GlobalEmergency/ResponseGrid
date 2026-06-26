import { UserDirectory, UserView } from '../domain/ports/user-directory';

export class InMemoryUserDirectory implements UserDirectory {
  private store = new Map<string, UserView>();

  seed(user: UserView): void {
    this.store.set(user.id, user);
  }

  async findByEmail(email: string): Promise<UserView | null> {
    for (const user of this.store.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<UserView | null> {
    return this.store.get(id) ?? null;
  }
}
