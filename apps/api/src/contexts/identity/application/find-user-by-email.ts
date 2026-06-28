import { UserRepository } from '../domain/ports/user.repository';
import { Email } from '../domain/email';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { permissionsForRole } from '../domain/authorization/role-catalog';
import { Permission } from '../domain/authorization/permission';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';

export interface FindUserByEmailCommand {
  actor: AuthorizationContext;
  email: string;
}

export interface FoundUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Holding any of these — at ANY scope — makes a principal an administrator who
 * may resolve a user by email (to invite them or grant them a role). Scoped to
 * directory-relevant capabilities so an ordinary member can't enumerate users.
 */
const DIRECTORY_PERMISSIONS: readonly Permission[] = [
  'role:grant',
  'user:invite',
  'user:read',
];

/**
 * Resolves an email to a principal id so an admin console can grant roles or
 * invite by email instead of by raw UUID. Authorized for any principal that
 * administers *some* scope (platform, org, group…), not only platform admins —
 * the per-scope attenuation on the actual grant still applies (docs/features/13
 * §5). Returns `null` for a malformed or unknown email.
 */
export class FindUserByEmail {
  constructor(private readonly users: UserRepository) {}

  async execute(cmd: FindUserByEmailCommand): Promise<FoundUser | null> {
    if (!this.administersSomeScope(cmd.actor)) {
      throw new NotAuthorizedToReadError('users');
    }

    let email: Email;
    try {
      email = Email.fromString(cmd.email);
    } catch {
      return null;
    }

    const user = await this.users.findByEmail(email);
    if (!user) return null;
    return { id: user.id.value, email: user.email.value, name: user.name };
  }

  /** True if any active grant confers a directory permission. */
  private administersSomeScope(actor: AuthorizationContext): boolean {
    const now = new Date();
    return actor.grants.some((snapshot) => {
      if (!Grant.fromSnapshot(snapshot).isActive(now)) return false;
      const perms = permissionsForRole(snapshot.roleId);
      return DIRECTORY_PERMISSIONS.some((p) => perms.includes(p));
    });
  }
}
