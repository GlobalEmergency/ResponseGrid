import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { usersTable } from './schema';
import { UserRepository } from '../../domain/ports/user.repository';
import { User, UserSnapshot } from '../../domain/user';
import { UserId } from '../../domain/user-id';
import { Email } from '../../domain/email';

type Row = typeof usersTable.$inferSelect;

function rowToSnapshot(row: Row): UserSnapshot {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    isAdmin: row.isAdmin,
  };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async save(user: User): Promise<void> {
    const s = user.toSnapshot();
    await this.db
      .insert(usersTable)
      .values({ ...s, passwordHash: s.passwordHash, isAdmin: s.isAdmin })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { name: s.name, isAdmin: s.isAdmin },
      });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.value));
    return rows[0] ? User.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id.value));
    return rows[0] ? User.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async recordLogin(id: UserId, at: Date): Promise<void> {
    await this.db
      .update(usersTable)
      .set({ lastLoginAt: at })
      .where(eq(usersTable.id, id.value));
  }
}
