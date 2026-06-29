import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { usersTable } from './schema';
import {
  UserAdminRepository,
  UserAdminRow,
} from '../../domain/ports/user-admin.repository';

type Row = typeof usersTable.$inferSelect;

/**
 * Read-model repository for the admin users console. Uses the typed Drizzle
 * query builder so `created_at` / `last_login_at` come back as Date (raw SQL
 * would string-type them and break `.toISOString()`).
 */
export class DrizzleUserAdminRepository implements UserAdminRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<UserAdminRow[]> {
    const rows = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
        lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable);
    return rows.map((r) => this.toRow(r));
  }

  async findById(id: string): Promise<UserAdminRow | null> {
    const rows = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
        lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return rows[0] ? this.toRow(rows[0]) : null;
  }

  private toRow(
    r: Pick<
      Row,
      'id' | 'email' | 'name' | 'isAdmin' | 'createdAt' | 'lastLoginAt'
    >,
  ): UserAdminRow {
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      isAdmin: r.isAdmin,
      createdAt: r.createdAt.toISOString(),
      lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
    };
  }
}
