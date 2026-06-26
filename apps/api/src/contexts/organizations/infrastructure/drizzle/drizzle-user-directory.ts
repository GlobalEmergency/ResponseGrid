import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { usersTable } from '../../../identity/infrastructure/drizzle/schema';
import { UserDirectory, UserView } from '../../domain/ports/user-directory';

export class DrizzleUserDirectory implements UserDirectory {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserView | null> {
    const rows = await this.db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, name: rows[0].name };
  }

  async findById(id: string): Promise<UserView | null> {
    const rows = await this.db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!rows[0]) return null;
    return { id: rows[0].id, email: rows[0].email, name: rows[0].name };
  }
}
