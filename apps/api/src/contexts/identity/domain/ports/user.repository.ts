import { User } from '../user';
import { UserId } from '../user-id';
import { Email } from '../email';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  /**
   * Stamp the user's last successful login (issue #176). Kept off {@link save}
   * (whose upsert only writes name/isAdmin) so login does not rewrite the rest
   * of the row. No-op concerns belong to the adapter.
   */
  recordLogin(id: UserId, at: Date): Promise<void>;
}
