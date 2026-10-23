import { desc, eq, sql } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { usersTable } from './schema';
import { UserRepository } from '../../domain/ports/user.repository';
import { User, UserSnapshot } from '../../domain/user';
import { UserId } from '../../domain/user-id';
import { Email } from '../../domain/email';
import { normalizePhone } from '../../domain/phone-normalization';

type Row = typeof usersTable.$inferSelect;

function rowToSnapshot(row: Row): UserSnapshot {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    isAdmin: row.isAdmin,
    phone: row.phone ?? null,
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
        set: { name: s.name, isAdmin: s.isAdmin, phone: s.phone },
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

  async findByPhone(phone: string): Promise<User[]> {
    const digits = normalizePhone(phone);
    if (digits === '') return [];
    // Compare STORED phone stripped of every non-digit against the normalised
    // input, so `+58 412 555 0101`, `(58) 412.555.0101` and `+584125550101` all
    // match. `digits` is bound as a parameter and only ever contains [0-9], so
    // there is no injection surface. Null phones drop out (regexp_replace(NULL)
    // is NULL). Most recent first for the ambiguous-match tie-break (#315).
    const rows = await this.db
      .select()
      .from(usersTable)
      .where(
        sql`regexp_replace(${usersTable.phone}, '[^0-9]', '', 'g') = ${digits}`,
      )
      .orderBy(desc(usersTable.createdAt));
    return rows.map((r) => User.fromSnapshot(rowToSnapshot(r)));
  }

  async setPassword(id: UserId, passwordHash: string): Promise<void> {
    await this.db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, id.value));
  }

  async recordLogin(id: UserId, at: Date): Promise<void> {
    await this.db
      .update(usersTable)
      .set({ lastLoginAt: at })
      .where(eq(usersTable.id, id.value));
  }
}
