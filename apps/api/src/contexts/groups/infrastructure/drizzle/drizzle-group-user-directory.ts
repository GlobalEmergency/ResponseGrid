import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { usersTable } from '../../../identity/infrastructure/drizzle/schema';
import { GroupUserDirectory } from '../../domain/ports/user-directory';

/** Resolves a user id from an email by reading the identity `users` table. */
export class DrizzleGroupUserDirectory implements GroupUserDirectory {
  constructor(private readonly db: Db) {}

  async findIdByEmail(email: string): Promise<string | null> {
    const rows = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return rows[0]?.id ?? null;
  }
}
