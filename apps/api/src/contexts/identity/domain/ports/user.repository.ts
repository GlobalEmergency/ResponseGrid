import { User } from '../user';
import { UserId } from '../user-id';
import { Email } from '../email';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  /**
   * Users whose phone matches `phone` after normalisation (see
   * {@link normalizePhone}), ordered MOST RECENT FIRST. Returns `[]` when none
   * match or the normalised input is empty. A list — not a single user —
   * because `phone` is not unique: a historically shared/duplicated number can
   * match several accounts, and the trusted-phone login must pick the most
   * recent and flag the ambiguity rather than fail or guess silently (#315).
   */
  findByPhone(phone: string): Promise<User[]>;
  save(user: User): Promise<void>;
  /**
   * Stamp the user's last successful login (issue #176). Kept off {@link save}
   * (whose upsert only writes name/isAdmin) so login does not rewrite the rest
   * of the row. No-op concerns belong to the adapter.
   */
  recordLogin(id: UserId, at: Date): Promise<void>;
}
